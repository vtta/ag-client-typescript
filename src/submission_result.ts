import { AGTestCaseFeedbackConfig } from "./ag_test_case";
import { AGTestCommandFeedbackConfig } from "./ag_test_command";
import { AGTestSuiteFeedbackConfig } from "./ag_test_suite";
import { ID } from "./base";
import { MutationTestSuiteFeedbackConfig } from "./mutation_test_suite";

export interface SubmissionResultFeedback {
    pk: ID;
    total_points: string;
    total_points_possible: string;
    ag_test_suite_results: AGTestSuiteResultFeedback[];
    student_test_suite_results: MutationTestSuiteResultFeedback[];
}

export interface AGTestSuiteResultFeedback {
    pk: ID;
    ag_test_suite_name: string;
    ag_test_suite_pk: ID;
    fdbk_settings: AGTestSuiteFeedbackConfig;
    total_points: number;
    total_points_possible: number;
    setup_name: string | null;
    setup_return_code: number | null;
    setup_timed_out: boolean | null;
    ag_test_case_results: AGTestCaseResultFeedback[];
}

export interface AGTestCaseResultFeedback {
    pk: ID;
    ag_test_case_name: string;
    ag_test_case_pk: ID;
    fdbk_settings: AGTestCaseFeedbackConfig;
    total_points: number;
    total_points_possible: number;
    ag_test_command_results: AGTestCommandResultFeedback[];
}

export interface AGTestCommandResultFeedback {
    pk: ID;
    ag_test_command_pk: ID;
    ag_test_command_name: string;
    fdbk_settings: AGTestCommandFeedbackConfig;
    timed_out: boolean | null;
    return_code_correct: boolean | null;
    expected_return_code: number | null;
    actual_return_code: number | null;
    return_code_points: number;
    return_code_points_possible: number;
    stdout_correct: boolean | null;
    stdout_points: number;
    stdout_points_possible: number;
    stderr_correct: boolean | null;
    stderr_points: number;
    stderr_points_possible: number;
    total_points: number;
    total_points_possible: number;
}

export interface MutationTestSuiteResultFeedback {
    pk: number;
    student_test_suite_name: string;
    student_test_suite_pk: number;
    fdbk_settings: MutationTestSuiteFeedbackConfig;
    has_setup_command: boolean;
    setup_command_name: string | null;
    setup_return_code: number | null;
    setup_timed_out: boolean | null;
    get_student_test_names_return_code: number | null;
    get_student_test_names_timed_out: boolean | null;
    student_tests: string[];
    discarded_tests: string[];
    invalid_tests: string[] | null;
    timed_out_tests: string[] | null;
    num_bugs_exposed: number | null;
    bugs_exposed: string[] | null;
    total_points: string;
    total_points_possible: string;
}
