export type WireFile = {
  id: string;
  filename: string;
  mimeType: string;
  fileSize: number;
};

export type WirePost = {
  id: string;
  projectId: string;
  authorAdminId: string;
  body: string | null;
  forAiContext: boolean;
  clientVisible: boolean;
  createdAt: string;
  updatedAt: string;
  files: WireFile[];
};

export type WireComment = {
  id: string;
  postId: string;
  parentCommentId: string | null;
  authorType: "admin" | "client";
  authorAdminId: string | null;
  authorClientUserId: string | null;
  authorDisplayName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type ViewerSelf =
  | { kind: "admin"; clerkUserId: string }
  | { kind: "client"; clientUserId: string; displayName: string };
