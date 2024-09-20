import {
	DevEnvironment,
	BuildEnvironment,
	createServerHotChannel,
	createServerModuleRunner
} from 'vite';

export const AsyncFunction = /** @type {typeof Function} */ (async function () {}.constructor);

export const asyncFunctionDeclarationPaddingLineCount = /** #__PURE__ */ (() => {
	const body = '/*code*/';
	const source = new AsyncFunction('a', 'b', body).toString();
	return source.slice(0, source.indexOf(body)).split('\n').length - 1;
})();

class NodeDevEnvironment extends DevEnvironment {
	/** @type {{ entrypoint: string }} */
	#options;
	#initialized = false;
	/** @type {(request: Request) => Promise<Response>} */
	#handler = () => {
		throw new Error('Not initilialized');
	};

	/**
	 * @param {string} name
	 * @param {import('vite').ResolvedConfig} config
	 * @param {{ entrypoint: string }} options
	 */
	constructor(name, config, options) {
		super(name, config, {
			hot: createServerHotChannel(),
			runner: {
				processSourceMap(map) {
					// this assumes that "new AsyncFunction" is used to create the module
					return Object.assign({}, map, {
						mappings: ';'.repeat(asyncFunctionDeclarationPaddingLineCount) + map.mappings
					});
				}
			}
		});
		this.#options = options;
	}

	async init() {
		await super.init();

		if (!this.#initialized) {
			const moduleRunner = createServerModuleRunner(this);
			const entrypoint = await moduleRunner.import(this.#options.entrypoint);
			this.#handler = entrypoint.default.fetch;
			this.#initialized = true;
		}
	}

	/** @param {Request} request */
	async dispatchFetch(request) {
		return this.#handler(request);
	}
}

/**
 * @param {{ entrypoint: string }} options
 * @returns {import('vite').EnvironmentOptions}
 */
export function createNodeEnvironment(options) {
	return {
		dev: {
			createEnvironment(name, config) {
				return new NodeDevEnvironment(name, config, options);
			}
		},
		build: {
			createEnvironment(name, config) {
				return new BuildEnvironment(name, config);
			}
		}
	};
}

/**
 * @param {{ entrypoint: string }} options
 * @returns {import('vite').Plugin}
 */
export function node_environment_plugin(options) {
	return {
		name: 'vite-plugin-node-environment',
		config() {
			return {
				environments: {
					ssr: createNodeEnvironment(options)
				}
			};
		}
	};
}

/** @param {any} environment */
export function is_fetchable_dev_environment(environment) {
	return typeof environment?.dispatchFetch === 'function';
}
