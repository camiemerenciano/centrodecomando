export type UserRole = 'owner' | 'admin' | 'member'
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type ClientStatus = 'active' | 'paused' | 'churned'
export type ConversationChannel = 'internal' | 'whatsapp' | 'instagram' | 'email'
export type CalendarEventType = 'event' | 'deadline' | 'meeting' | 'post'

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  plan: string
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  email: string | null
  updated_at: string
}

export interface OrganizationMember {
  id: string
  org_id: string
  user_id: string
  role: UserRole
  joined_at: string
  profile?: Profile
}

export interface Client {
  id: string
  org_id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  avatar_url: string | null
  status: ClientStatus
  tags: string[]
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  org_id: string
  title: string
  description: string | null
  assignee_id: string | null
  client_id: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  tags: string[]
  created_by: string | null
  created_at: string
  updated_at: string
  assignee?: Profile
  client?: Client
}

export interface PipelineStage {
  id: string
  org_id: string
  name: string
  color: string
  position: number
  deals?: PipelineDeal[]
}

export interface PipelineDeal {
  id: string
  org_id: string
  stage_id: string
  client_id: string | null
  title: string
  value: number
  probability: number
  assignee_id: string | null
  close_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  client?: Client
  assignee?: Profile
}

export interface Conversation {
  id: string
  org_id: string
  client_id: string | null
  channel: ConversationChannel
  title: string | null
  status: string
  created_at: string
  updated_at: string
  client?: Client
  last_message?: Message
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string | null
  content: string
  attachments: unknown[]
  read_at: string | null
  created_at: string
  sender?: Profile
}

export interface CalendarEvent {
  id: string
  org_id: string
  title: string
  description: string | null
  client_id: string | null
  assignee_id: string | null
  start_at: string
  end_at: string
  all_day: boolean
  color: string
  type: CalendarEventType
  created_at: string
  client?: Client
  assignee?: Profile
}
