import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";

export type ProgressEventListener = (event: ProgressEvent) => void;

export class HttpClient {
    private static _instance: HttpClient | null = null;

    private _axios_instance: AxiosInstance = axios.create({
        baseURL: '/api/',
    });

    private constructor() {}

    static get_instance(): HttpClient {
        if (HttpClient._instance === null) {
            HttpClient._instance = new HttpClient();
        }
        return HttpClient._instance;
    }

    set_base_url(base_url: string) {
        this._axios_instance.defaults.baseURL = base_url;
    }

    set_default_headers(headers: object) {
        /* istanbul ignore next */
        this._axios_instance.defaults.headers = headers;
    }

    async get<T = unknown>(
        url: string,
        options: {on_download_progress?: ProgressEventListener} = {}
    ): Promise<HttpResponse<T>> {
        try {
            return new HttpResponse(
                await this._axios_instance.get<T>(
                    url, {onDownloadProgress: options.on_download_progress}));
        }
        catch (e) {
            let response = get_axios_response(e);
            throw new HttpError(response.status, response.data, url, response.headers);
        }
    }

    async get_file(
        url: string,
        options: {on_download_progress?: ProgressEventListener} = {}
    ): Promise<HttpResponse<Blob>> {
        try {
            return new HttpResponse(
                await this._axios_instance.get(
                    url,
                    {responseType: "blob", onDownloadProgress: options.on_download_progress}));
        }
        catch (e) {
            let response = get_axios_response(e);
            throw new HttpError(response.status, response.data, url, response.headers);
        }
    }

    async post<T = unknown>(
        url: string, data?: unknown,
        options: {on_upload_progress?: ProgressEventListener} = {}
    ): Promise<HttpResponse<T>> {
        try {
            return new HttpResponse(
                await this._axios_instance.post<T>(
                    url, data, {onUploadProgress: options.on_upload_progress}));
        }
        catch (e) {
            let response = get_axios_response(e);
            throw new HttpError(response.status, response.data, url, response.headers);
        }
    }

    async put<T = unknown>(
        url: string, data?: unknown,
        options: {on_upload_progress?: ProgressEventListener} = {}
    ): Promise<HttpResponse<T>> {
        try {
            return new HttpResponse(
                await this._axios_instance.put<T>(
                    url, data, {onUploadProgress: options.on_upload_progress}));
        }
        catch (e) {
            let response = get_axios_response(e);
            throw new HttpError(response.status, response.data, url, response.headers);
        }
    }

    async patch<T = unknown>(url: string, data?: unknown): Promise<HttpResponse<T>> {
        try {
            return new HttpResponse(await this._axios_instance.patch<T>(url, data));
        }
        catch (e) {
            let response = get_axios_response(e);
            throw new HttpError(response.status, response.data, url, response.headers);
        }
    }

    async delete(url: string): Promise<HttpResponse<unknown>> {
        try {
            return new HttpResponse(await this._axios_instance.delete(url));
        }
        catch (e) {
            let response = get_axios_response(e);
            throw new HttpError(response.status, response.data, url, response.headers);
        }
    }

    /* istanbul ignore next */
    authenticate(auth_token: string) {
        this._axios_instance.defaults.headers.common['Authorization']
            = `Token ${auth_token}`;
    }
}

function get_axios_response(error: unknown): AxiosResponse {
    let response = (error as AxiosError).response;
    if (response === undefined) {
        /* istanbul ignore next */
        throw error;
    }
    return response;
}

export class HttpResponse<T = unknown> {
    data: T;
    status: number;
    headers: unknown;

    constructor(args: {status: number, data: T, headers: unknown}) {
        this.data = args.data;
        this.status = args.status;
        this.headers = args.headers;
    }
}

export class HttpError extends Error {
    status: number;
    data: object | string;
    url: string;
    headers: {[key: string]: string};

    // See https://github.com/Microsoft/TypeScript/issues/13965
    __proto__: Error; // tslint:disable-line

    constructor(status: number, data: object | string, url: string = '', headers = {}) {
        const actual_proto = new.target.prototype;
        super('HTTP response error: ' + status);
        this.__proto__ = actual_proto;

        this.status = status;
        this.data = data;
        this.url = url;
        this.headers = headers;
    }

    // tslint:disable-next-line:naming-convention
    toString() {
        return 'HTTP response status: '
               + `${this.status.toString()}\n${JSON.stringify(this.data)}`;
    }
}
