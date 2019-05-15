import { AGTestCommandData, AGTestCommand } from "./ag_test_command";
import { SaveableAPIObject, Deletable, ID } from "./base";

class AGTestCaseCoreData {
    pk: ID;
    name: string;
    ag_test_suite: ID;

    normal_fdbk_config: AGTestCaseFeedbackConfig;
    ultimate_submission_fdbk_config: AGTestCaseFeedbackConfig;
    past_limit_submission_fdbk_config: AGTestCaseFeedbackConfig;
    staff_viewer_fdbk_config: AGTestCaseFeedbackConfig;

    last_modified: string;

    constructor(args: AGTestCaseCoreData) {
        this.pk = args.pk;
        this.name = args.name;
        this.ag_test_suite = args.ag_test_suite;

        this.normal_fdbk_config = args.normal_fdbk_config;
        this.ultimate_submission_fdbk_config = args.ultimate_submission_fdbk_config;
        this.past_limit_submission_fdbk_config = args.past_limit_submission_fdbk_config;
        this.staff_viewer_fdbk_config = args.staff_viewer_fdbk_config;

        this.last_modified = args.last_modified;
    }
}

interface AGTestCaseCtorArgs extends AGTestCaseCoreData {
    ag_test_commands: AGTestCommandData[];
}

export interface AGTestCaseData extends AGTestCaseCtorArgs {
    // Typescript hack for nominal typing.
    // See https://github.com/Microsoft/Typescript/issues/202
    // and https://michalzalecki.com/nominal-typing-in-typescript/
    _ag_test_case_data_brand: unknown;
}

export interface AGTestCaseObserver {
    update_ag_test_case_created(ag_test_case: AGTestCase): void;
    update_ag_test_case_changed(ag_test_case: AGTestCase): void;
    update_ag_test_case_deleted(ag_test_case: AGTestCase): void;
    update_ag_test_cases_order_changed(ag_test_case_order: number[],
                                       ag_test_suite_pk: number): void;
}

export class AGTestCase extends AGTestCaseCoreData implements SaveableAPIObject, Deletable {
    // Typescript hack for nominal typing.
    // See https://github.com/Microsoft/Typescript/issues/202
    // and https://michalzalecki.com/nominal-typing-in-typescript/
    private _ag_test_case_brand: unknown;

    ag_test_commands: AGTestCommand[];

    constructor(args: AGTestCaseCtorArgs) {
        super(args);
        this.ag_test_commands = args.ag_test_commands.map(
            (data) => new AGTestCommand(data));
    }

    private static _subscribers = new Set<AGTestCaseObserver>();

    static subscribe(observer: AGTestCaseObserver) {
        AGTestCase._subscribers.add(observer);
    }

    static unsubscribe(observer: AGTestCaseObserver) {
        AGTestCase._subscribers.delete(observer);
    }

    static async get_all_from_ag_test_suite(ag_test_suite_pk: ID): Promise<AGTestCase[]> {

    }

    static async get_by_pk(ag_test_case_pk: ID): Promise<AGTestCase> {

    }

    static async create(ag_test_suite_pk: ID, data: NewAGTestCaseData): Promise<AGTestCase> {

    }

    static notify_ag_test_case_created(ag_test_case: AGTestCase) {
        for (let subscriber of AGTestCase._subscribers) {
            subscriber.update_ag_test_case_created(ag_test_case);
        }
    }

    async save(): Promise<void> {

    }

    async refresh(): Promise<void> {

    }

    static notify_ag_test_case_changed(ag_test_case: AGTestCase) {
        for (let subscriber of AGTestCase._subscribers) {
            subscriber.update_ag_test_case_changed(ag_test_case);
        }
    }

    async delete(): Promise<void> {

    }

    static notify_ag_test_case_deleted(ag_test_case: AGTestCase) {
        for (let subscriber of AGTestCase._subscribers) {
            subscriber.update_ag_test_case_deleted(ag_test_case);
        }
    }

    static async get_order(ag_test_suite_pk: ID): Promise<ID[]> {

    }

    static async update_order(ag_test_suite_pk: ID, ag_test_case_order: ID[]): Promise<ID> {

    }

    static notify_ag_test_case_order_updated(ag_test_case_order: ID[], ag_test_case_pk: ID) {
        for (let subscriber of AGTestCase._subscribers) {
            subscriber.update_ag_test_cases_order_changed(
                ag_test_case_order, ag_test_case_pk);
        }
    }
}

export class NewAGTestCaseData {
    name: string;
    normal_fdbk_config?: AGTestCaseFeedbackConfig;
    ultimate_submission_fdbk_config?: AGTestCaseFeedbackConfig;
    past_limit_submission_fdbk_config?: AGTestCaseFeedbackConfig;
    staff_viewer_fdbk_config?: AGTestCaseFeedbackConfig;

    constructor(args: NewAGTestCaseData) {
        this.name = args.name;
        this.normal_fdbk_config = args.normal_fdbk_config;
        this.ultimate_submission_fdbk_config = args.ultimate_submission_fdbk_config;
        this.past_limit_submission_fdbk_config = args.past_limit_submission_fdbk_config;
        this.staff_viewer_fdbk_config = args.staff_viewer_fdbk_config;
    }
}

export interface AGTestCaseFeedbackConfig {
    visible: boolean;
    show_individual_commands: boolean;
}
