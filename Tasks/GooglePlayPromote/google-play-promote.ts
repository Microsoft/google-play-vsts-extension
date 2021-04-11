import * as path from 'path';
import * as tl from 'azure-pipelines-task-lib/task';
import * as googleutil from './googleutil';

async function run() {
    try {
        tl.setResourcePath(path.join( __dirname, 'task.json'));
        const authType: string = tl.getInput('authType', true);
        let key: googleutil.ClientKey = {};
        if (authType === 'JsonFile') {
            const serviceAccountKeyFile: string = tl.getPathInput('serviceAccountKey', false);
            if (!serviceAccountKeyFile) {
                throw new Error(tl.loc('JsonKeyFileNotFound'));
            }
            const stats: tl.FsStats = tl.stats(serviceAccountKeyFile);
            if (stats && stats.isFile()) {
                key = require(serviceAccountKeyFile);
            } else {
                console.error(tl.loc('InvalidAuthFile'));
                throw new Error(tl.loc('InvalidAuthFilewithName', serviceAccountKeyFile));
            }
        } else if (authType === 'ServiceEndpoint') {
            const serviceEndpoint: tl.EndpointAuthorization = tl.getEndpointAuthorization(tl.getInput('serviceEndpoint', true), true);
            if (!serviceEndpoint) {
                throw new Error(tl.loc('EndpointNotFound'));
            }
            key.client_email = serviceEndpoint.parameters['username'];
            key.private_key = serviceEndpoint.parameters['password'].replace(/\\n/g, '\n');
        }

        const packageName: string = tl.getPathInput('packageName', true);
        const sourceTrack: string = tl.getInput('sourceTrack', true);
        const destinationTrack: string = tl.getInput('destinationTrack', true);
        const userFractionSupplied: boolean = tl.getBoolInput('rolloutToUserFraction');
        const userFraction: number = Number(userFractionSupplied ? tl.getInput('userFraction', false) : 1.0);
        const сleanSourceTrack: boolean = tl.getBoolInput('сleanTheSourceTrack');
        const versionCode: string = tl.getInput('versionCode', false);

        // Constants
        const globalParams: googleutil.GlobalParams = { auth: null, params: {} };

        const jwtClient = googleutil.getJWT(key);
        const edits: any = googleutil.publisher.edits;

        globalParams.auth = jwtClient;
        googleutil.updateGlobalParams(globalParams, 'packageName', packageName);

        console.log(tl.loc('Authenticating'));
        await jwtClient.authorize();
        const edit = await googleutil.getNewEdit(edits, globalParams, packageName);
        googleutil.updateGlobalParams(globalParams, 'editId', edit.id);

        console.log(tl.loc('GetTrackInfo', sourceTrack));
        let track = await googleutil.getTrack(edits, packageName, sourceTrack);
        tl.debug(`Current track: ${JSON.stringify(track)}`);

        const toPromote = track.releases.find(release => release.versionCodes.includes(Number(versionCode)));

        if (versionCode !== undefined && toPromote === undefined) {
            throw new Error(tl.loc('VersionCodeToPromoteNotFound', versionCode));
        }

        const releaseToPromote = toPromote !== undefined ? toPromote : track.releases[0];
        tl.debug(`Promoting release: ${JSON.stringify(releaseToPromote)}`);

        console.log(tl.loc('PromoteTrack', destinationTrack));
        track = await googleutil.updateTrack(edits, packageName, destinationTrack, releaseToPromote.versionCodes, userFraction, releaseToPromote.releaseNotes);
        tl.debug(`Update track: ${JSON.stringify(track)}`);

        if (сleanSourceTrack) {
            console.log(tl.loc('CleanTrack', sourceTrack));
            track = await googleutil.updateTrack(edits, packageName, sourceTrack, [], userFraction);
            tl.debug(`Update clean track: ${JSON.stringify(track)}`);
        }

        await edits.commit();

        console.log(tl.loc('PromoteSucceed'));
        console.log(tl.loc('SourceTrack', sourceTrack));
        console.log(tl.loc('DestTrack', destinationTrack));
        tl.setResult(tl.TaskResult.Succeeded, tl.loc('Success'));
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, err);
    }
}

run();
