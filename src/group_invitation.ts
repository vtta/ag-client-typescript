import { ID, Refreshable } from "./base";
import { Group, GroupData } from "./group";
import { HttpClient } from "./http_client";
import { safe_assign } from "./utils";

export class GroupInvitationData {
    pk: ID;
    invitation_creator: string;
    project: ID;
    invited_usernames: string[];
    invitees_who_accepted: string[];

    constructor(args: GroupInvitationData) {
        this.pk = args.pk;
        this.invitation_creator = args.invitation_creator;
        this.project = args.project;
        this.invited_usernames = args.invited_usernames;
        this.invitees_who_accepted = args.invitees_who_accepted;
    }
}

export class GroupInvitation extends GroupInvitationData implements Refreshable {
    static async send_invitation(project_pk: ID,
                                 invited_usernames: string[]): Promise<GroupInvitation> {
        let response = await HttpClient.get_instance().post<GroupInvitationData>(
            `/projects/${project_pk}/group_invitations/`, {invited_usernames: invited_usernames});
        return new GroupInvitation(response.data);
    }

    static async get_by_pk(group_invitation_pk: ID): Promise<GroupInvitation> {
        let response = await HttpClient.get_instance().get<GroupInvitationData>(
            `/group_invitations/${group_invitation_pk}/`);
        return new GroupInvitation(response.data);
    }

    // TODO: if we're the last person to accept and a group is created, call
    // Group.notify_group_created
    async accept(): Promise<Group | null> {
        let response = await HttpClient.get_instance().post<GroupData | GroupInvitationData>(
            `/group_invitations/${this.pk}/accept/`);
        if (response.status === 201) {
            return new Group(<GroupData> response.data);
        }

        safe_assign(this, new GroupInvitation(<GroupInvitation> response.data));
        return null;
    }

    async reject(): Promise<void> {
        await HttpClient.get_instance().delete(`/group_invitations/${this.pk}/`);
    }

    async refresh(): Promise<void> {
        let reloaded = await GroupInvitation.get_by_pk(this.pk);
        safe_assign(this, reloaded);
    }
}
