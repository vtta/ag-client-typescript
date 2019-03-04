import { Deletable, SaveableAPIObject } from "src/base";

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

export class ExpectedStudentFile extends ExpectedStudentFileData implements SaveableAPIObject, Deletable {
    private static _subscribers = new Set<ExpectedStudentFileObserver>();

    static subscribe(observer: ExpectedStudentFileObserver) {
        ExpectedStudentFile._subscribers.add(observer);
    }

    static unsubscribe(observer: ExpectedStudentFileObserver) {
        ExpectedStudentFile._subscribers.delete(observer);
    }

    static async get_all_from_project(project_pk: number): Promise<ExpectedStudentFile[]> {

    }

    static async get_by_pk(expected_student_file_pk: number): Promise<ExpectedStudentFile> {

    }

    static async create(project_pk: number, name: string, content: Blob): Promise<ExpectedStudentFile> {

    }

    static notify_expected_student_file_created(expected_student_file: ExpectedStudentFile) {

    }

    static notify_expected_student_file_changed(expected_student_file: ExpectedStudentFile) {

    }

    async save(): Promise<void> {

    }

    static readonly EDITABLE_FIELDS: (keyof ExpectedStudentFileData)[] = [

    ];
}
