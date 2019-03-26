import {
    Course,
    CriterionResult,
    CriterionResultData, CriterionResultObserver, HandgradingRubric,
    Project
} from '..';

import {
    do_editable_fields_test,
    expect_dates_equal,
    expect_dates_not_equal,
    global_setup,
    make_superuser,
    reset_db,
    run_in_django_shell, sleep,
} from './utils';

beforeAll(() => {
    global_setup();
});

let course!: Course;
let project!: Project;
let handgrading_rubric!: HandgradingRubric;

class TestObserver implements CriterionResultObserver {
    criterion_result: CriterionResult | null = null;

    created_count = 0;
    changed_count = 0;
    deleted_count = 0;

    update_criterion_result_changed(criterion_result: CriterionResult): void {
        this.changed_count += 1;
        this.criterion_result = criterion_result;
    }

    update_criterion_result_created(criterion_result: CriterionResult): void {
        this.created_count += 1;
        this.criterion_result = criterion_result;
    }

    update_criterion_result_deleted(criterion_result: CriterionResult): void {
        this.deleted_count += 1;
        this.criterion_result = null;
    }
}

let observer!: TestObserver;

beforeEach(async () => {
    reset_db();
    make_superuser();
    course = await Course.create({name: 'Course'});
    project = await Project.create(course.pk, {name: 'Project'});
    handgrading_rubric = await HandgradingRubric.create(project.pk, {});
    await course.add_students(['ffuxa@umich.edu']);
    let students = course.get_students();
    observer = new TestObserver();
    CriterionResult.subscribe(observer);
});

afterEach(() => {
    CriterionResult.unsubscribe(observer);
});

// TODO: Finish tests
