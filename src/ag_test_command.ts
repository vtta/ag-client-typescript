import { SaveableAPIObject, Deletable, ID } from "./base";
import { InstructorFile } from "./instructor_file";

export class AGTestCommandData {
    pk: ID;
    name: string

    ag_test_case: ID;
    last_modified: string;

    cmd: string

    stdin_source: string;
    stdin_text: string;
    stdin_instructor_file: InstructorFile;

    expected_return_code: ExpectedReturnCode;

    expected_stdout_source: ExpectedOutputSource;
    expected_stdout_text: string;
    expected_stdout_instructor_file: InstructorFile;

    expected_stderr_source: ExpectedOutputSource;
    expected_stderr_text: string
    expected_stderr_instructor_file: InstructorFile;

    ignore_case: boolean;
    ignore_whitespace: boolean;
    ignore_whitespace_changes: boolean;
    ignore_blank_lines: boolean;

    points_for_correct_return_code: number;

    points_for_correct_stdout: number;
    points_for_correct_stderr: number;

    deduction_for_wrong_stdout: number;
    deduction_for_wrong_stderr: number;

    normal_fdbk_config: AGTestCommandFeedbackConfig;
    first_failed_test_normal_fdbk_config: AGTestCommandFeedbackConfig;
    ultimate_submission_fdbk_config: AGTestCommandFeedbackConfig;
    past_limit_submission_fdbk_config: AGTestCommandFeedbackConfig;
    staff_viewer_fdbk_config: AGTestCommandFeedbackConfig;

    time_limit: number;
    stack_size_limit: number;
    virtual_memory_limit: number;
    process_spawn_limit: number;

    constructor(args: AGTestCommandData) {
        this.pk = args.pk;
        this.name = args.name;
        this.ag_test_case = args.ag_test_case;
        this.last_modified = args.last_modified;

        this.cmd = args.cmd;

        this.stdin_source = args.stdin_source;
        this.stdin_text = args.stdin_text;
        this.stdin_instructor_file = args.stdin_instructor_file;

        this.expected_return_code = args.expected_return_code;
        this.expected_stdout_source = args.expected_stdout_source;
        this.expected_stdout_text = args.expected_stdout_text;
        this.expected_stdout_instructor_file = args.expected_stdout_instructor_file;
        this.expected_stderr_source = args.expected_stderr_source;
        this.expected_stderr_text = args.expected_stderr_text;
        this.expected_stderr_instructor_file = args.expected_stderr_instructor_file;

        this.ignore_case = args.ignore_case;
        this.ignore_whitespace = args.ignore_whitespace;
        this.ignore_whitespace_changes = args.ignore_whitespace_changes;
        this.ignore_blank_lines = args.ignore_blank_lines;

        this.points_for_correct_return_code = args.points_for_correct_return_code;
        this.points_for_correct_stdout = args.points_for_correct_stdout;
        this.points_for_correct_stderr = args.points_for_correct_stderr;
        this.deduction_for_wrong_stdout = args.deduction_for_wrong_stdout;
        this.deduction_for_wrong_stderr = args.deduction_for_wrong_stderr;

        this.normal_fdbk_config = args.normal_fdbk_config;
        this.first_failed_test_normal_fdbk_config = args.first_failed_test_normal_fdbk_config;
        this.ultimate_submission_fdbk_config = args.ultimate_submission_fdbk_config;
        this.past_limit_submission_fdbk_config = args.past_limit_submission_fdbk_config;
        this.staff_viewer_fdbk_config = args.staff_viewer_fdbk_config;

        this.time_limit = args.time_limit;
        this.stack_size_limit = args.stack_size_limit;
        this.virtual_memory_limit = args.virtual_memory_limit;
        this.process_spawn_limit = args.process_spawn_limit;
    }
}

export interface AGTestCommandObserver {
    update_ag_test_command_created(ag_test_command: AGTestCommand): void;
    update_ag_test_command_changed(ag_test_command: AGTestCommand): void;
    update_ag_test_command_deleted(ag_test_command: AGTestCommand): void;
    update_ag_test_commands_order_changed(ag_test_command_order: number[],
                                          ag_test_case_pk: number): void;
}

export class AGTestCommand extends AGTestCommandData implements SaveableAPIObject, Deletable {
    private static _subscribers = new Set<AGTestCommandObserver>();

    static subscribe(observer: AGTestCommandObserver) {
        AGTestCommand._subscribers.add(observer);
    }

    static unsubscribe(observer: AGTestCommandObserver) {
        AGTestCommand._subscribers.delete(observer);
    }

    static async get_all_from_ag_test_case(ag_test_case_pk: ID): Promise<AGTestCommand[]> {

    }

    static async get_by_pk(ag_test_command_pk: ID): Promise<AGTestCommand> {

    }

    static async create(ag_test_case_pk: ID, data: NewAGTestCommandData): Promise<AGTestCommand> {

    }

    static notify_ag_test_command_created(ag_test_command: AGTestCommand) {
        for (let subscriber of AGTestCommand._subscribers) {
            subscriber.update_ag_test_command_created(ag_test_command);
        }
    }

    async save(): Promise<void> {

    }

    async refresh(): Promise<void> {

    }

    static notify_ag_test_command_changed(ag_test_command: AGTestCommand) {
        for (let subscriber of AGTestCommand._subscribers) {
            subscriber.update_ag_test_command_changed(ag_test_command);
        }
    }

    async delete(): Promise<void> {

    }

    static notify_ag_test_command_deleted(ag_test_command: AGTestCommand) {
        for (let subscriber of AGTestCommand._subscribers) {
            subscriber.update_ag_test_command_deleted(ag_test_command);
        }
    }

    static async get_order(ag_test_case_pk: ID): Promise<ID[]> {

    }

    static async update_order(ag_test_case_pk: ID, ag_test_command_order: ID[]): Promise<ID> {

    }

    static notify_ag_test_command_order_updated(ag_test_command_order: ID[], ag_test_case_pk: ID) {
        for (let subscriber of AGTestCommand._subscribers) {
            subscriber.update_ag_test_commands_order_changed(
                ag_test_command_order, ag_test_case_pk);
        }
    }

    static readonly EDITABLE_FIELDS: (keyof AGTestCommandData)[] = [
        'name',
        'cmd',

        'stdin_source',
        'stdin_text',
        'stdin_instructor_file',

        'expected_return_code',

        'expected_stdout_source',
        'expected_stdout_text',
        'expected_stdout_instructor_file',

        'expected_stderr_source',
        'expected_stderr_text',
        'expected_stderr_instructor_file',

        'ignore_case',
        'ignore_whitespace',
        'ignore_whitespace_changes',
        'ignore_blank_lines',

        'points_for_correct_return_code',

        'points_for_correct_stdout',
        'points_for_correct_stderr',

        'deduction_for_wrong_stdout',
        'deduction_for_wrong_stderr',

        'normal_fdbk_config',
        'first_failed_test_normal_fdbk_config',
        'ultimate_submission_fdbk_config',
        'past_limit_submission_fdbk_config',
        'staff_viewer_fdbk_config',

        'time_limit',
        'stack_size_limit',
        'virtual_memory_limit',
        'process_spawn_limit',
    ];
}

export class NewAGTestCommandData {
    name: string
    cmd: string

    stdin_source?: string;
    stdin_text?: string;
    stdin_instructor_file?: InstructorFile;

    expected_return_code?: ExpectedReturnCode;

    expected_stdout_source?: ExpectedOutputSource;
    expected_stdout_text?: string;
    expected_stdout_instructor_file?: InstructorFile;

    expected_stderr_source?: ExpectedOutputSource;
    expected_stderr_text?: string
    expected_stderr_instructor_file?: InstructorFile;

    ignore_case?: boolean;
    ignore_whitespace?: boolean;
    ignore_whitespace_changes?: boolean;
    ignore_blank_lines?: boolean;

    points_for_correct_return_code?: number;

    points_for_correct_stdout?: number;
    points_for_correct_stderr?: number;

    deduction_for_wrong_stdout?: number;
    deduction_for_wrong_stderr?: number;

    normal_fdbk_config?: AGTestCommandFeedbackConfig;
    first_failed_test_normal_fdbk_config?: AGTestCommandFeedbackConfig;
    ultimate_submission_fdbk_config?: AGTestCommandFeedbackConfig;
    past_limit_submission_fdbk_config?: AGTestCommandFeedbackConfig;
    staff_viewer_fdbk_config?: AGTestCommandFeedbackConfig;

    time_limit?: number;
    stack_size_limit?: number;
    virtual_memory_limit?: number;
    process_spawn_limit?: number;

    constructor(args: AGTestCommandData) {
        this.name = args.name;
        this.cmd = args.cmd;

        this.stdin_source = args.stdin_source;
        this.stdin_text = args.stdin_text;
        this.stdin_instructor_file = args.stdin_instructor_file;

        this.expected_return_code = args.expected_return_code;
        this.expected_stdout_source = args.expected_stdout_source;
        this.expected_stdout_text = args.expected_stdout_text;
        this.expected_stdout_instructor_file = args.expected_stdout_instructor_file;
        this.expected_stderr_source = args.expected_stderr_source;
        this.expected_stderr_text = args.expected_stderr_text;
        this.expected_stderr_instructor_file = args.expected_stderr_instructor_file;

        this.ignore_case = args.ignore_case;
        this.ignore_whitespace = args.ignore_whitespace;
        this.ignore_whitespace_changes = args.ignore_whitespace_changes;
        this.ignore_blank_lines = args.ignore_blank_lines;

        this.points_for_correct_return_code = args.points_for_correct_return_code;
        this.points_for_correct_stdout = args.points_for_correct_stdout;
        this.points_for_correct_stderr = args.points_for_correct_stderr;
        this.deduction_for_wrong_stdout = args.deduction_for_wrong_stdout;
        this.deduction_for_wrong_stderr = args.deduction_for_wrong_stderr;

        this.normal_fdbk_config = args.normal_fdbk_config;
        this.first_failed_test_normal_fdbk_config = args.first_failed_test_normal_fdbk_config;
        this.ultimate_submission_fdbk_config = args.ultimate_submission_fdbk_config;
        this.past_limit_submission_fdbk_config = args.past_limit_submission_fdbk_config;
        this.staff_viewer_fdbk_config = args.staff_viewer_fdbk_config;

        this.time_limit = args.time_limit;
        this.stack_size_limit = args.stack_size_limit;
        this.virtual_memory_limit = args.virtual_memory_limit;
        this.process_spawn_limit = args.process_spawn_limit;
    }
}

export interface AGTestCommandFeedbackConfig {
    visible: boolean;
    return_code_fdbk_level: ValueFeedbackLevel;
    stdout_fdbk_level: ValueFeedbackLevel;
    stderr_fdbk_level: ValueFeedbackLevel;
    show_points: boolean;
    show_actual_return_code: boolean;
    show_actual_stdout: boolean;
    show_actual_stderr: boolean;
    show_whether_timed_out: boolean;
}

export enum ValueFeedbackLevel {
    no_feedback = 'no_feedback',
    correct_or_incorrect = 'correct_or_incorrect',
    expected_and_actual = 'expected_and_actual'
}

export enum StdinSource {
    none = 'none',
    text = 'text',
    instructor_file = 'instructor_file',
    setup_stdout = 'setup_stdout',
    setup_stderr = 'setup_stderr'
}

export enum ExpectedOutputSource {
    none = 'none',
    text = 'text',
    instructor_file = 'instructor_file',
}

export enum ExpectedReturnCode {
    none = 'none',
    zero = 'zero',
    nonzero = 'nonzero',
}
