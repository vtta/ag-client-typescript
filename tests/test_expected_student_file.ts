import {
    Course,
    ExpectedStudentFile,
    ExpectedStudentFileObserver,
    Project
} from '..';

import {
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

class TestObserver implements ExpectedStudentFileObserver {
    expected_student_file: ExpectedStudentFile | null = null;

    created_count = 0;
    changed_count = 0;
    deleted_count = 0;

    update_expected_student_file_changed(expected_student_file: ExpectedStudentFile): void {
        this.changed_count += 1;
        this.expected_student_file = expected_student_file;
    }

    update_expected_student_file_created(expected_student_file: ExpectedStudentFile): void {
        this.created_count += 1;
        this.expected_student_file = expected_student_file;
    }

    update_expected_student_file_deleted(expected_student_file: ExpectedStudentFile): void {
        this.deleted_count += 1;
        this.expected_student_file = null;
    }
}

let observer!: TestObserver;

beforeEach(async () => {
    reset_db();
    make_superuser();
    course = await Course.create({name: 'Course'});
    project = await Project.create(course.pk, {name: 'Project'});

    observer = new TestObserver();
    ExpectedStudentFile.subscribe(observer);
});

afterEach(() => {
    ExpectedStudentFile.unsubscribe(observer);
});

describe.only('List/create expected student file tests', () => {
    test('Expected student file ctor', () => {
        let now = (new Date()).toISOString();
        let expected_student_file = new ExpectedStudentFile({
            pk: 6,
            project: project.pk,
            pattern: 'filey',
            min_num_matches: 2,
            max_num_matches: 3,
            last_modified: now,
        });

        expect(expected_student_file.pk).toEqual(6);
        expect(expected_student_file.project).toEqual(project.pk);
        expect(expected_student_file.pattern).toEqual('filey');
        expect(expected_student_file.min_num_matches).toEqual(2);
        expect(expected_student_file.max_num_matches).toEqual(3);
        expect(expected_student_file.last_modified).toEqual(now);
    });

    test('List expected student files', async () => {
        let create_expected_student_files = `
from autograder.core.models import Project, ExpectedStudentFile
project = Project.objects.get(pk=${project.pk})

ExpectedStudentFile.objects.validate_and_create(project=project, pattern=f'expected42')
ExpectedStudentFile.objects.validate_and_create(project=project, pattern=f'expected1')
ExpectedStudentFile.objects.validate_and_create(project=project, pattern=f'expected3')
        `;
        run_in_django_shell(create_expected_student_files);

        let loaded_expected_student_files = await ExpectedStudentFile.get_all_from_project(
            project.pk);

        let actual_patterns = loaded_expected_student_files.map(
            (expected_student_file) => expected_student_file.pattern);
        expect(actual_patterns).toEqual(['expected1', 'expected3', 'expected42']);
    });

    test('Create expected student file with defaults', async () => {
        let created = await ExpectedStudentFile.create(project.pk, {pattern: 'file.cpp'});

        let loaded = await ExpectedStudentFile.get_all_from_project(project.pk);
        expect(loaded.length).toEqual(1);
        let actual = loaded[0];

        expect(created).toEqual(actual);

        expect(actual.pattern).toEqual('file.cpp');
        expect(actual.min_num_matches).toEqual(1);
        expect(actual.max_num_matches).toEqual(1);

        expect(observer.expected_student_file).toEqual(actual);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Create expected student file no defaults', async () => {
        let created = await ExpectedStudentFile.create(
            project.pk, {pattern: '*.cpp', min_num_matches: 0, max_num_matches: 3});

        let loaded = await ExpectedStudentFile.get_all_from_project(project.pk);
        expect(loaded.length).toEqual(1);
        let actual = loaded[0];

        expect(created).toEqual(actual);

        expect(actual.pattern).toEqual('*.cpp');
        expect(actual.min_num_matches).toEqual(0);
        expect(actual.max_num_matches).toEqual(3);

        expect(observer.expected_student_file).toEqual(actual);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);
    });
});

describe('Get/update/delete expected student file tests', () => {
    test('Get expected student file', async () => {
        fail();
    });

    test('Update expected student file', async () => {
        fail();
    });

    test('Refresh expected student file', async () => {
        fail();
    });

    test('Delete expected student file', async () => {
        fail();
    });
});
