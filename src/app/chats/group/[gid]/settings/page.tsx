"use client";
import {
  Archive,
  Bell,
  Calendar,
  Loader2,
  LogOut,
  Megaphone,
  Pencil,
  Pin,
  ShieldCheck,
  ShieldOff,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import { useSocket } from "@/app/providers/SocketProvider";
import AddGroupMembersDialog from "@/components/AddGroupMembersDialog";
import {
  SettingsRow,
  SettingsSection,
  SettingsShell,
  SharedMediaSection,
  useSharedMedia,
} from "@/components/chat-settings/primitives";
import EditGroupDialog from "@/components/EditGroupDialog";
import GroupInviteCard from "@/components/GroupInviteCard";
import LeaveGroupDialog from "@/components/LeaveGroupDialog";
import { Switch } from "@/components/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Statuser } from "@/components/VerificationComponent";
import { useNavigateWithHistory } from "@/hooks/useNavigateWithHistory";
import ChatRepository from "@/lib/class/ChatRepository";
import ChatSystem from "@/lib/class/chatSystem";
import { ChatSettings, MessageAttributes, NewChatSettings } from "@/lib/types/type";
import { Time } from "@/lib/utils";
import { ConvoType, deleteConversation, updateConversation } from "@/redux/chatSlice";
import { useAppDispatch } from "@/redux/hooks";
import { RootState } from "@/redux/store";

interface Params {
  gid?: string;
}

interface ChatSetting {
  [x: string]: NewChatSettings;
}

interface CHT {
  messages: MessageAttributes[];
  settings: ChatSetting;
  conversations: ConvoType[];
  loading: boolean;
}

interface MemberRow {
  userId: string;
  username: string;
  name: string;
  displayPicture: string;
}

const chatRepository = new ChatRepository();

const chatSystem = new ChatSystem(chatRepository);

const ChatSettingsPage: React.FC = () => {
  const router = useRouter();
  const navigate = useNavigateWithHistory();
  const params = useParams() as Params;
  const { gid } = params;
  const {
    conversations,
    settings,
    messages,
    loading: convoLoading,
  } = useSelector<RootState, CHT>((state) => state.chat);
  const [chatSettings, setChatSettings] = useState<NewChatSettings | undefined>(undefined);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [roleBusyId, setRoleBusyId] = useState<string | null>(null);
  const [restrictBusy, setRestrictBusy] = useState(false);
  const convo = useMemo(
    () => conversations?.find((c) => c.id === gid) as ConvoType,
    [conversations, gid]
  );
  const { userdata } = useSelector((state: RootState) => state.user);
  const socket = useSocket();
  const dispatch = useAppDispatch();
  const isAdmin = Boolean(convo?.adminIds?.includes(String(userdata._id)));
  const sharedMedia = useSharedMedia(messages, gid);

  useEffect(() => {
    if (!convoLoading) {
      const chatSettings = settings?.[gid as string];
      if (chatSettings) {
        setChatSettings((prev) => ({
          ...prev,
          ...chatSettings,
          isPinned: convo?.pinned || false,
          isArchived: convo?.archived || false,
        }));
      }
    }
  }, [gid, convoLoading, settings]);

  const memberCount = convo?.participants?.length ?? 0;
  useEffect(() => {
    if (!gid) return;
    let cancelled = false;
    chatSystem
      .getParticipants(gid)
      .then((rows) => {
        if (!cancelled) setMembers(rows);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gid, memberCount]);

  const removeMember = async (member: MemberRow) => {
    if (removingId) return;
    setRemovingId(member.userId);
    try {
      const result = await chatSystem.removeParticipants(gid as string, [member.userId]);
      dispatch(
        updateConversation({
          id: gid as string,
          updates: {
            participants: result.participants.map((participant) => participant.userId),
            adminIds: result.adminIds,
          },
        })
      );
      toast.success(`${member.name || member.username} was removed from the group`);
    } catch (error) {
      toast.error("Could not remove member", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setRemovingId(null);
    }
  };

  const changeRole = async (member: MemberRow, makeAdmin: boolean) => {
    if (roleBusyId) return;
    setRoleBusyId(member.userId);
    try {
      const adminIds = await chatSystem.setAdmin(gid as string, member.userId, makeAdmin);
      dispatch(updateConversation({ id: gid as string, updates: { adminIds } }));
      toast.success(
        makeAdmin
          ? `${member.name || member.username} is now an admin`
          : `${member.name || member.username} is no longer an admin`
      );
    } catch (error) {
      toast.error("Could not change the admin role", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setRoleBusyId(null);
    }
  };

  const setOnlyAdminsCanSend = async (value: boolean) => {
    if (restrictBusy) return;
    setRestrictBusy(true);
    dispatch(updateConversation({ id: gid as string, updates: { onlyAdminsCanSend: value } }));
    try {
      await chatSystem.updateChat(gid as string, { onlyAdminsCanSend: value });
    } catch (error) {
      dispatch(updateConversation({ id: gid as string, updates: { onlyAdminsCanSend: !value } }));
      toast.error("Could not update the group", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setRestrictBusy(false);
    }
  };

  const handleSettingsChange = async (field: keyof ChatSettings, value: any) => {
    if (chatSettings) {
      setChatSettings({ ...chatSettings, [field]: value });
      if (field === "isMuted") {
        await chatSystem.updateChatSettings(gid as string, { isMuted: value });
        return;
      } else if (field === "isPinned") {
        dispatch(updateConversation({ id: gid as string, updates: { pinned: value } }));
      } else if (field === "isArchived") {
        dispatch(updateConversation({ id: gid as string, updates: { archived: value } }));
      }
      // The participant row stores these as `pinned` / `archived`.
      const column = field === "isPinned" ? "pinned" : field === "isArchived" ? "archived" : field;
      socket?.emit("updateConversation", {
        id: gid,
        updates: { [column]: value },
      });
    }
  };

  if (!convo || !chatSettings) {
    return (
      <SettingsShell title="Group settings" onBack={() => navigate()}>
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-gray-400" />
        </div>
      </SettingsShell>
    );
  }

  return (
    <SettingsShell title="Group settings" onBack={() => navigate()}>
      <section className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-800">
        <div className="relative mx-auto mb-3 size-fit">
          <Avatar className="size-24 border-2 border-white shadow-md dark:border-neutral-900">
            <AvatarFallback className="text-xl">
              {convo.name?.slice(0, 2).toUpperCase() || ""}
            </AvatarFallback>
            <AvatarImage
              src={convo.displayPicture}
              className="displayPicture size-24 rounded-full object-cover"
              width={96}
              height={96}
              alt="Display Picture"
            />
          </Avatar>
          {convo.verified && (
            <div className="absolute bottom-0 right-0">
              <Statuser className="size-5" />
            </div>
          )}
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{convo.name}</h2>
        <p className="mx-auto mt-1 max-w-sm whitespace-pre-line text-sm text-gray-500 dark:text-gray-400">
          {convo.description || <span className="italic">No description</span>}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
            <Users className="size-3.5" />
            {convo.participants.length} members
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <ShieldCheck className="size-3.5" />
            {convo.adminIds.length} {convo.adminIds.length === 1 ? "admin" : "admins"}
          </span>
        </div>
        <p className="mt-3 inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
          <Calendar className="size-3.5" />
          Created {Time(convo.timestamp)}
        </p>
        {isAdmin && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-neutral-600 dark:text-gray-200 dark:hover:bg-neutral-700"
            >
              <Pencil size={14} />
              Edit group
            </button>
          </div>
        )}
      </section>

      <SettingsSection title="Preferences">
        <SettingsRow
          icon={Bell}
          tone="amber"
          title="Notifications"
          description={chatSettings.isMuted ? "Muted — no alerts" : "Alerts for new messages"}
        >
          <Switch
            id="mute"
            checked={chatSettings.isMuted}
            onChange={(value: any) => handleSettingsChange("isMuted", value)}
          />
        </SettingsRow>
        <SettingsRow icon={Pin} tone="blue" title="Pin chat" description="Keep this chat at the top">
          <Switch
            id="pin"
            checked={chatSettings.isPinned}
            onChange={(value: any) => handleSettingsChange("isPinned", value)}
          />
        </SettingsRow>
        <SettingsRow
          icon={Archive}
          tone="green"
          title="Archive chat"
          description="Move this chat out of your inbox"
        >
          <Switch
            id="archive"
            checked={chatSettings.isArchived}
            onChange={(value: any) => handleSettingsChange("isArchived", value)}
          />
        </SettingsRow>
      </SettingsSection>

      {isAdmin && (
        <SettingsSection title="Admin controls">
          <SettingsRow
            icon={Megaphone}
            tone="purple"
            title="Only admins can send messages"
            description={
              convo.onlyAdminsCanSend ? "Members can read but not reply" : "Everyone can send messages"
            }
          >
            <Switch
              id="only-admins-send"
              checked={Boolean(convo.onlyAdminsCanSend)}
              onChange={(value: any) => setOnlyAdminsCanSend(Boolean(value))}
            />
          </SettingsRow>
        </SettingsSection>
      )}

      <SettingsSection title={`Members · ${convo.participants.length}`}>
        <SettingsRow
          icon={Users}
          title="Group members"
          description={isAdmin ? "You can add or remove people" : "Only admins can change members"}
        >
          {isAdmin && (
            <button
              type="button"
              onClick={() => setAddMembersOpen(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
            >
              <UserPlus size={16} />
              Add
            </button>
          )}
        </SettingsRow>
        {membersLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="size-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <ul className="max-h-80 divide-y overflow-y-auto dark:divide-neutral-700">
            {members.map((member) => {
              const memberIsAdmin = convo.adminIds?.includes(member.userId);
              const isSelf = member.userId === String(userdata._id);
              const label = member.name || member.username;
              return (
                <li key={member.userId} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarFallback className="text-xs">
                        {label.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                      <AvatarImage
                        src={member.displayPicture}
                        alt={label}
                        className="size-9 rounded-full object-cover"
                      />
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {label}
                        {isSelf && <span className="text-gray-400"> (you)</span>}
                      </p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        @{member.username}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {memberIsAdmin && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        Admin
                      </span>
                    )}
                    {isAdmin && !(memberIsAdmin && convo.adminIds.length <= 1) && (
                      <button
                        type="button"
                        onClick={() => changeRole(member, !memberIsAdmin)}
                        disabled={roleBusyId !== null}
                        aria-label={
                          memberIsAdmin ? `Remove ${label} as admin` : `Make ${label} an admin`
                        }
                        title={memberIsAdmin ? "Remove admin" : "Make admin"}
                        className="rounded-md p-2 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-amber-950"
                      >
                        {roleBusyId === member.userId ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : memberIsAdmin ? (
                          <ShieldOff size={16} />
                        ) : (
                          <ShieldCheck size={16} />
                        )}
                      </button>
                    )}
                    {isAdmin && !memberIsAdmin && (
                      <button
                        type="button"
                        onClick={() => removeMember(member)}
                        disabled={removingId !== null}
                        aria-label={`Remove ${label} from the group`}
                        className="rounded-md p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-red-950"
                      >
                        {removingId === member.userId ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <UserMinus size={16} />
                        )}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SettingsSection>

      {isAdmin && <GroupInviteCard chatId={gid as string} />}

      <SharedMediaSection href={`/chats/group/${gid}/media`} data={sharedMedia} />

      <SettingsSection>
        <SettingsRow
          icon={LogOut}
          destructive
          title="Leave group"
          description="Stop receiving messages from this group"
          onClick={() => setLeaveOpen(true)}
        />
      </SettingsSection>

      <LeaveGroupDialog
        chatId={gid as string}
        groupName={convo.name ?? "this group"}
        userId={String(userdata._id)}
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        onLeft={() => {
          dispatch(deleteConversation(gid as string));
          router.replace("/chats");
        }}
      />

      {isAdmin && (
        <>
          <AddGroupMembersDialog
            chatId={gid as string}
            existingMemberIds={convo.participants ?? []}
            open={addMembersOpen}
            onOpenChange={setAddMembersOpen}
            onAdded={(participantIds) =>
              dispatch(
                updateConversation({
                  id: gid as string,
                  updates: { participants: participantIds },
                })
              )
            }
          />
          <EditGroupDialog
            chatId={gid as string}
            name={convo.name ?? ""}
            description={convo.description ?? ""}
            displayPicture={convo.displayPicture ?? ""}
            open={editOpen}
            onOpenChange={setEditOpen}
            onSaved={({ name, description, displayPicture }) =>
              dispatch(
                updateConversation({
                  id: gid as string,
                  updates: { name, description, displayPicture },
                })
              )
            }
          />
        </>
      )}
    </SettingsShell>
  );
};

export default ChatSettingsPage;
