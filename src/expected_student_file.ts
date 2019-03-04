import { Deletable, SaveableAPIObject } from "src/base";
import { HttpClient } from 'src/http_client';
import { filter_keys, safe_assign } from 'src/utils';

export class ExpectedStudentFileData {
    pk: number;
    project: number;
    pattern: string;
    min_num_matches: number;
    max_num_matches: number;
    last_modified: string;

    constructor({
        pk,
        project,
        pattern,
        min_num_matches,
        max_num_matches,
        last_modified,
    }: ExpectedStudentFileData) {
        this.pk = pk;
        this.project = project;
        this.pattern = pattern;
        this.min_num_matches = min_num_matches;
        this.max_num_matches = max_num_matches;
        this.last_modified = last_modified;
    }
}

export interface ExpectedStudentFileObserver {
    update_expected_student_file_created(expected_student_file: ExpectedStudentFile): void;
    update_expected_student_file_changed(expected_student_file: ExpectedStudentFile): void;
    update_expected_student_file_deleted(expected_student_file: ExpectedStudentFile): void;
}

export class ExpectedStudentFile extends ExpectedStudentFileData implements SaveableAPIObject,
                                                                            Deletable {
    private static _subscribers = new Set<ExpectedStudentFileObserver>();

    static subscribe(observer: ExpectedStudentFileObserver) {
        ExpectedStudentFile._subscribers.add(observer);
    }

    static unsubscribe(observer: ExpectedStudentFileObserver) {
        ExpectedStudentFile._subscribers.delete(observer);
    }

    static async get_all_from_project(project_pk: number): Promise<ExpectedStudentFile[]> {
        let response = await HttpClient.get_instance().get<ExpectedStudentFileData[]>(
            `/projects/${project_pk}/expected_student_files/`
        );
        let result = response.data.map((data) => new ExpectedStudentFile(data));
        result.sort((first, second) => first.pattern.localeCompare(second.pattern));
        return result;
    }

    static async get_by_pk(expected_student_file_pk: number): Promise<ExpectedStudentFile> {
        let response = await HttpClient.get_instance().get<ExpectedStudentFileData>(
            `/expected_student_files/${expected_student_file_pk}/`
        );
        return new ExpectedStudentFile(response.data);
    }

    static async create(project_pk: number,
                        data: NewExpectedStudentFileData): Promise<ExpectedStudentFile> {
        let response = await HttpClient.get_instance().post<ExpectedStudentFileData>(
            `/projects/${project_pk}/expected_student_files/`,
            data
        );
        let result = new ExpectedStudentFile(response.data);
        ExpectedStudentFile.notify_expected_student_file_created(result);
        return result;
    }

    static notify_expected_student_file_created(expected_student_file: ExpectedStudentFile) {
        for (let subscriber of ExpectedStudentFile._subscribers) {
            subscriber.update_expected_student_file_created(expected_student_file);
        }
    }

    async save(): Promise<void> {
        let response = await HttpClient.get_instance().patch<ExpectedStudentFileData>(
            `/expected_student_files/${this.pk}/`,
            filter_keys(this, ExpectedStudentFile.EDITABLE_FIELDS)
        );

        safe_assign(this, response.data);
        ExpectedStudentFile.notify_expected_student_file_changed(this);
    }

    async refresh(): Promise<void> {
        let last_modified = this.last_modified;
        let response = await HttpClient.get_instance().get<ExpectedStudentFileData>(
            `/expected_student_files/${this.pk}/`
        );

        safe_assign(this, response.data);
        if (last_modified !== this.last_modified) {
            ExpectedStudentFile.notify_expected_student_file_changed(this);
        }
    }

    static notify_expected_student_file_changed(expected_student_file: ExpectedStudentFile) {
        for (let subscriber of ExpectedStudentFile._subscribers) {
            subscriber.update_expected_student_file_changed(expected_student_file);
        }
    }

    async delete(): Promise<void> {
        await HttpClient.get_instance().delete(
            `/expected_student_files/${this.pk}/`
        );
        ExpectedStudentFile.notify_expected_student_file_deleted(this);
    }

    static notify_expected_student_file_deleted(expected_student_file: ExpectedStudentFile) {
        for (let subscriber of ExpectedStudentFile._subscribers) {
            subscriber.update_expected_student_file_deleted(expected_student_file);
        }
    }

    static readonly EDITABLE_FIELDS: (keyof ExpectedStudentFileData)[] = [
        'pattern',
        'min_num_matches',
        'max_num_matches'
    ];
}

export class NewExpectedStudentFileData {
    pattern: string;
    min_num_matches?: number;
    max_num_matches?: number;

    constructor({
        pattern,
        min_num_matches,
        max_num_matches
    }: NewExpectedStudentFileData) {
        this.pattern = pattern;
        this.min_num_matches = min_num_matches;
        this.max_num_matches = max_num_matches;
    }
}
