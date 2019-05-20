import {
    Course,
    ExpectedStudentFile,
    GradingStatus,
    Group,
    Project,
    Submission,
    SubmissionObserver
} from "..";

import {
    do_editable_fields_test,
    global_setup,
    make_superuser,
    reset_db,
    run_in_django_shell, sleep,
    SUPERUSER_NAME
} from "./utils";

beforeAll(() => {
    global_setup();
});

let group: Group;

beforeEach(async () => {
    reset_db();
    make_superuser();
    let course = await Course.create({name: 'Course'});
    let project = await Project.create(course.pk, {name: 'Project'});
    await ExpectedStudentFile.create(project.pk, {pattern: '*', max_num_matches: 10});
    group = await Group.create_solo_group(project.pk);
});


describe('Submission ctor tests', () => {
    test('Submission ctor', () => {
        let now = new Date().toISOString();

        let submission = new Submission({
            pk: 5,
            group: 7,

            timestamp: now,
            submitter: 'batman',

            submitted_filenames: ['spam', 'egg'],
            discarded_files: ['very', 'nope'],
            missing_files: {'oops': 1, '*.cpp': 3},

            status: GradingStatus.being_graded,

            count_towards_daily_limit: false,
            is_past_daily_limit: false,
            is_bonus_submission: true,
            count_towards_total_limit: true,

            does_not_count_for: ['robin'],

            position_in_queue: 3,

            last_modified: now,
        });

        expect(submission.pk).toEqual(5);
        expect(submission.group).toEqual(7);

        expect(submission.timestamp).toEqual(now);
        expect(submission.submitter).toEqual('batman');

        expect(submission.submitted_filenames).toEqual(['spam', 'egg']);
        expect(submission.discarded_files).toEqual(['very', 'nope']);
        expect(submission.missing_files).toEqual({'oops': 1, '*.cpp': 3});

        expect(submission.status).toEqual(GradingStatus.being_graded);

        expect(submission.count_towards_daily_limit).toEqual(false);
        expect(submission.is_past_daily_limit).toEqual(false);
        expect(submission.is_bonus_submission).toEqual(true);
        expect(submission.count_towards_total_limit).toEqual(true);

        expect(submission.does_not_count_for).toEqual(['robin']);

        expect(submission.position_in_queue).toEqual(3);

        expect(submission.last_modified).toEqual(now);
    });
});

class TestObserver implements SubmissionObserver {
    submission: Submission | null = null;
    created_count = 0;
    changed_count = 0;

    update_submission_changed(submission: Submission): void {
        this.changed_count += 1;
        this.submission = submission;
    }

    update_submission_created(submission: Submission): void {
        this.submission = submission;
        this.created_count += 1;
    }
}

describe('Submission list/create tests', () => {
    test('Get submissions from group', async () => {
        let make_submissions = `
from autograder.core.models import Group, Submission

group = Group.objects.get(pk=${group.pk})

for i in range(3):
    s = Submission.objects.validate_and_create([], group)
    s.status = Submission.GradingStatus.finished_grading
    s.save()
        `;
        run_in_django_shell(make_submissions);

        let submissions = await Submission.get_all_from_group(group.pk);
        expect(submissions.length).toEqual(3);
    });

    test('Get submissions from group list empty', async () => {
        let submissions = await Submission.get_all_from_group(group.pk);
        expect(submissions.length).toEqual(0);
    });

    test('Create submission', async () => {
        let observer = new TestObserver();
        Submission.subscribe(observer);

        let files = [
            new File(['content1'], 'file1'),
            new File(['content2'], 'file2'),
            new File(['content3'], 'file3'),
        ];

        let submission = await Submission.create(group.pk, files);
        expect(submission.submitter).toEqual(SUPERUSER_NAME);
        expect(submission.submitted_filenames).toEqual(['file1', 'file2', 'file3']);

        expect(observer.created_count).toEqual(1);
        expect(observer.submission).toEqual(submission);
    });
});

describe('Submission detail endpoint tests', () => {
    let submission: Submission;
    let observer: TestObserver;

    beforeEach(async () => {
        let files = [
            new File(['content1'], 'file1'),
            new File(['content2'], 'file2'),
            new File(['content3'], 'file3'),
        ];

        submission = await Submission.create(group.pk, files);

        observer = new TestObserver();
        Submission.subscribe(observer);
    });

    test('Admin edit submission', async () => {
        expect(submission.count_towards_daily_limit).toEqual(true);
        expect(submission.count_towards_total_limit).toEqual(true);

        submission.count_towards_daily_limit = false;
        submission.count_towards_total_limit = false;

        await submission.save();

        let loaded = await Submission.get_by_pk(submission.pk);
        expect(loaded.count_towards_daily_limit).toEqual(false);
        expect(loaded.count_towards_total_limit).toEqual(false);

        expect(observer.submission).toEqual(submission);
        expect(observer.changed_count).toEqual(1);
    });

    test('Remove submission from queue', async () => {
        expect(submission.status).toEqual(GradingStatus.received);

        await submission.remove_from_queue();

        expect(submission.status).toEqual(GradingStatus.removed_from_queue);

        expect(observer.submission).toEqual(submission);
        expect(observer.changed_count).toEqual(1);
    });

    test('Get submitted file content', async () => {
        let content = await submission.get_file_content('file2');
        expect(content).toEqual('content2');
    });

    test('Refresh', async () => {
        expect(submission.status).toEqual(GradingStatus.received);

        let update_submission = `
from autograder.core.models import Submission

s = Submission.objects.get(pk=${submission.pk})
s.status = Submission.GradingStatus.being_graded
s.save()
        `;

        await sleep(1);

        run_in_django_shell(update_submission);

        await submission.refresh();

        expect(observer.submission).toEqual(submission);
        expect(observer.changed_count).toEqual(1);
    });

    test('Unsubscribe', async () => {
        await submission.save();
        expect(observer.changed_count).toEqual(1);

        Submission.unsubscribe(observer);

        await submission.save();
        expect(observer.changed_count).toEqual(1);
    });

    test('Editable fields', () => {
        do_editable_fields_test(Submission, 'Submission');
    });
});
