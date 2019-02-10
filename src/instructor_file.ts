import { SaveableAPIObject } from 'src/base';
import { HttpClient } from 'src/http_client';
import { sort_by_name } from 'src/utils';

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

export class InstructorFile extends InstructorFileData implements SaveableAPIObject {
    static async get_all_from_project(project_pk: number): Promise<InstructorFile[]> {
        let response = await HttpClient.get_instance().get<InstructorFileData[]>(
            `/projects/${project_pk}/instructor_files/`
        );
        let files = response.data.map(file_data => new InstructorFile(file_data));
        sort_by_name(files);
        return files;
    }

    static async create(project_pk: number, name: string, content: Blob): Promise<InstructorFile> {
        let form_data = new FormData();
        form_data.append('file_obj', content, name);

        let response = await HttpClient.get_instance().post<InstructorFile>(
            `/projects/${project_pk}/instructor_files/`,
            form_data
        );

        return new InstructorFile(response.data);
    }

    async save(): Promise<void> {

    }

    async refresh(): Promise<void> {

    }
}
