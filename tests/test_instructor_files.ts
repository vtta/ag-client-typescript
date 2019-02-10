import { Course, InstructorFile, Project } from '..';

import {
    do_editable_fields_test,
    global_setup,
    make_superuser,
    reset_db,
    run_in_django_shell,
    sleep
} from './utils';

beforeAll(() => {
    global_setup();
});

let course!: Course;
let project!: Project;

beforeEach(async () => {
    reset_db();
    make_superuser();
    course = await Course.create({name: 'Course'});
    project = await Project.create({name: 'Project', course: course.pk});
});

describe('List/create instructor file tests', () => {
    test('Instructor file ctor', () => {
        let now = new Date().toISOString();
        let file = new InstructorFile({
            pk: 42,
            project: project.pk,
            name: 'filey',
            size: 1000,
            last_modified: now,
        });

        expect(file.pk).toEqual(42);
        expect(file.project).toEqual(project.pk);
        expect(file.name).toEqual('filey');
        expect(file.size).toEqual(1000);
        expect(file.last_modified).toEqual(now);
    });

    test('List instructor files', async () => {
        let create_files = `
from autograder.core.models import InstructorFile, Project
from django.core.files.uploadedfile import SimpleUploadedFile

project = Project.objects.get(pk=${project.pk})

for i in range(2):
    InstructorFile.objects.validate_and_create(
        project=project,
        file_obj=SimpleUploadedFile(f'file{i}', b'spam')
    )
        `;

        run_in_django_shell(create_files);

        let files = await InstructorFile.get_all_from_project(project.pk);
        expect(files[0].name).toEqual('file0');
        expect(files[0].size).toEqual(4);
        expect(files[0].project).toEqual(project.pk);
        expect(files[1].name).toEqual('file1');
        expect(files[1].size).toEqual(4);
        expect(files[1].project).toEqual(project.pk);
    });

    test.only('Create instructor file', async () => {
        let content = 'spameggsausagespam';
        let new_file = await InstructorFile.create(
            project.pk, 'fileo', new Blob([content])
        );

        expect(new_file.name).toEqual('fileo');
        expect(new_file.project).toEqual(project.pk);
        expect(new_file.size).toEqual(content.length);

        let get_content = `
from autograder.core.models import InstructorFile
file_ = InstructorFile.objects.get(pk=${new_file.pk})
with file_.open() as f:
    print(f.read(), end='')
        `;

        let {stdout} = run_in_django_shell(get_content);
        expect(stdout).toEqual(content);
    });
});

describe('Get/update/delete instructor file tests', () => {
    test('Get instructor file', async () => {
        fail();
    });

    test('Get instructor file content', () => {
        fail();
    });

    test('Update instructor file content', async () => {
        fail();
    });

    test('Rename instructor file', async () => {
        fail();
    });

    test('Delete instructor file', async () => {
        fail();
    });
});
