import { createReadableStream } from '@sveltejs/kit/node';
import { from_fs } from '../../../utils/filesystem.js';

export default {
	/**
	 * This fetch handler is the entrypoint for the environment.
	 * @param {Request} request
	 */
	fetch: async (request) => {
		console.log('Request in Node environment');

		// This needs to be imported dynamically for the read_implementation etc. to be set.
		// Is this because the module is treated as external?
		const { Server } = await import('../../../runtime/server/index.js');

		const environment_context = await import('__sveltekit/environment_context');

		const { set_assets } = await import('__sveltekit/paths');
		set_assets(environment_context.assets);

		const server = new Server(environment_context.manifest);

		await server.init({
			env: environment_context.env,
			read: (file) => createReadableStream(from_fs(file))
		});

		return server.respond(request, {
			getClientAddress: () => {
				if (environment_context.remote_address) return environment_context.remote_address;
				throw new Error('Could not determine clientAddress');
			}
		});
	}
};
