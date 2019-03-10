import { ExpectedStudentFile } from './expected_student_file';
import { InstructorFile } from './instructor_file';

export class AGTestSuiteData {
    pk: number;
    name: string;
    project: number;
    last_modified: string;

    instructor_files_needed: InstructorFile[];
    read_only_instructor_files: boolean;

    student_files_needed: ExpectedStudentFile[];

    // ag_test_cases

    setup_suite_cmd: string;
    setup_suite_cmd_name: string;

    docker_image_to_use: string;

    allow_network_access: boolean;
    deferred: boolean;

    normal_fdbk_config
    ultimate_submission_fdbk_config
    past_limit_submission_fdbk_config
    staff_viewer_fdbk_config
}

export class AGTestSuiteFeedbackConfig {

}
