export interface Member {
  id?: number;
  id_number: string;
  full_name: string;
  rank: string;
  responsibility: string;
  phone_number: string;
  photo_url: string;
  left_flag_url?: string;
  center_logo_url?: string;
  right_flag_url?: string;
  created_at?: string;
}

export interface ScanLog {
  id: number;
  member_id: number;
  scan_time: string;
  scanner_info: string;
}
