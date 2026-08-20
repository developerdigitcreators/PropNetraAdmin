import { axiosClient } from '@/lib/axios-client';

export const DELETE_REMARK_MIN_LENGTH = 3;

export function deleteWithRemark(url: string, remark: string) {
  return axiosClient.delete(url, { data: { remark: remark.trim() } });
}
