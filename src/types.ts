export type TaskStatus = 'Upcoming' | 'In Progress' | 'Completed' | 'Not Update';
export type RequestStatus = 'Holding' | 'Approved' | 'Rejected';

export interface DateRequest {
  requestedDate: string;
  status: RequestStatus;
}

export type DelegationStatus = 'Assigned' | 'On Process' | 'Review' | 'Done' | 'Reject';

export interface ActionRequest {
  type: 'Delay' | 'Completed';
  status: RequestStatus;
  timestamp: string;
}

export interface Task {
  id: string;
  code: string;
  location: string;
  parentTask?: string;
  projectCode?: string;
  projectName?: string;
  parentComments?: string;
  name: string;
  startDate: string; // ISO string
  finishDate: string; // ISO string
  siteUpdateDate?: string; // ISO string
  delegationStatus?: DelegationStatus;
  report?: string;
  attachments?: { name: string; url: string; type: string }[];
  comments?: string;
  actionRequest?: ActionRequest;
  startDateRequest?: DateRequest;
  finishDateRequest?: DateRequest;
  groupId?: string;
  priority?: string;
  byParty?: string;
  originalSub?: any;
}
