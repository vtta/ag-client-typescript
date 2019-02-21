import { Refreshable } from './base';
import { HttpClient } from './http_client';
import { safe_assign, sort_by_name } from './utils';

export class InstructorFileData {
    pk: number;
    project: number;
    name: string;
    size: number;
    last_modified: string;

    constructor({
        pk,
        project,
        name,
        size,
        last_modified
    }: InstructorFileData) {
        this.pk = pk;
        this.project = project;
        this.name = name;
        this.size = size;
        this.last_modified = last_modified;
    }
}

export interface InstructorFileObserver {
    update_instructor_file_created(instructor_file: InstructorFile): void;
    update_instructor_file_renamed(instructor_file: InstructorFile): void;
    update_instructor_file_content_changed(instructor_file: InstructorFile): void;
    update_instructor_file_deleted(instructor_file: InstructorFile): void;
}

export class InstructorFile extends InstructorFileData implements Refreshable {
    private static _subscribers = new Set<InstructorFileObserver>();

    static subscribe(observer: InstructorFileObserver) {
        InstructorFile._subscribers.add(observer);
    }

    static unsubscribe(observer: InstructorFileObserver) {
        InstructorFile._subscribers.delete(observer);
    }

    static async get_all_from_project(project_pk: number): Promise<InstructorFile[]> {
        let response = await HttpClient.get_instance().get<InstructorFileData[]>(
            `/projects/${project_pk}/instructor_files/`
        );
        let files = response.data.map(file_data => new InstructorFile(file_data));
        sort_by_name(files);
        return files;
    }

    static async get_by_pk(instructor_file_pk: number): Promise<InstructorFile> {
        let response = await HttpClient.get_instance().get<InstructorFileData>(
            `/instructor_files/${instructor_file_pk}/`
        );
        return new InstructorFile(response.data);
    }

    static async create(project_pk: number, name: string, content: Blob): Promise<InstructorFile> {
        let form_data = new FormData();
        form_data.append('file_obj', content, name);

        let response = await HttpClient.get_instance().post<InstructorFile>(
            `/projects/${project_pk}/instructor_files/`,
            form_data
        );

        let new_file = new InstructorFile(response.data);

        InstructorFile.notify_instructor_file_created(new_file);

        return new_file;
    }

    static notify_instructor_file_created(instructor_file: InstructorFile) {
        for (let subscriber of InstructorFile._subscribers) {
            subscriber.update_instructor_file_created(instructor_file);
        }
    }

    async get_content(): Promise<string> {
        let response = await HttpClient.get_instance().get<string>(
            `/instructor_files/${this.pk}/content/`
        );
        return response.data;
    }

    async set_content(content: Blob): Promise<void> {
        let form_data = new FormData();
        form_data.append('file_obj', content, this.name);

        let response = await HttpClient.get_instance().put(
            `/instructor_files/${this.pk}/content/`,
            form_data
        );

        safe_assign(this, response.data);

        InstructorFile.notify_instructor_file_content_changed(this);
    }

    static notify_instructor_file_content_changed(instructor_file: InstructorFile) {
        for (let subscriber of InstructorFile._subscribers) {
            subscriber.update_instructor_file_content_changed(instructor_file);
        }
    }

    async rename(new_name: string): Promise<void> {
        let response = await HttpClient.get_instance().put(
            `/instructor_files/${this.pk}/name/`,
            {name: new_name}
        );

        safe_assign(this, response.data);

        InstructorFile.notify_instructor_file_renamed(this);
    }

    static notify_instructor_file_renamed(instructor_file: InstructorFile) {
        for (let subscriber of InstructorFile._subscribers) {
            subscriber.update_instructor_file_renamed(instructor_file);
        }
    }

    async refresh(): Promise<void> {
        let response = await HttpClient.get_instance().get<InstructorFileData>(
            `/instructor_files/${this.pk}/`
        );

        safe_assign(this, response.data);
    }

    async delete() {
        await HttpClient.get_instance().delete(`/instructor_files/${this.pk}/`);
        InstructorFile.notify_instructor_file_deleted(this);
    }

    static notify_instructor_file_deleted(instructor_file: InstructorFile) {
        for (let subscriber of InstructorFile._subscribers) {
            subscriber.update_instructor_file_deleted(instructor_file);
        }
    }
}
