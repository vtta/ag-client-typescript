import {
    Course,
    HandgradingResult, HandgradingResultObserver, HandgradingRubric, NewHandgradingResultData,
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

class TestObserver implements HandgradingResultObserver {
    handgrading_result: HandgradingResult | null = null;

    created_count = 0;
    changed_count = 0;
    deleted_count = 0;

    update_handgrading_result_changed(handgrading_result: HandgradingResult): void {
        this.changed_count += 1;
        this.handgrading_result = handgrading_result;
    }

    update_handgrading_result_created(handgrading_result: HandgradingResult): void {
        this.created_count += 1;
        this.handgrading_result = handgrading_result;
    }

    update_handgrading_result_deleted(handgrading_result: HandgradingResult): void {
        this.deleted_count += 1;
        this.handgrading_result = null;
    }
}

let observer!: TestObserver;

beforeEach(async () => {
    reset_db();
    make_superuser();
    course = await Course.create({name: 'Course'});
    project = await Project.create(course.pk, {name: 'Project'});
    handgrading_rubric = await HandgradingRubric.create(project.pk, {});

    observer = new TestObserver();
    HandgradingResult.subscribe(observer);
});

afterEach(() => {
    HandgradingResult.unsubscribe(observer);
});

