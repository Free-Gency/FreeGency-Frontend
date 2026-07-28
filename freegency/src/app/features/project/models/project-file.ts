
import { FileKind } from "./project-milestone";



export interface ProjectFile {
  id: string;
  projectId: string;
  milestoneId: string | null;
  uploadedByUserId: string;
  fileName: string;
  fileUrl: string;
  fileKind: FileKind;
  createdAt: string;
}