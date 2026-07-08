import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format } from 'date-fns';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const timeAgo = (date: string | Date) =>
  formatDistanceToNow(new Date(date), { addSuffix: true });

export const formatDate = (date: string | Date) =>
  format(new Date(date), 'MMM d, yyyy');

export const formatDateTime = (date: string | Date) =>
  format(new Date(date), 'MMM d, yyyy h:mm a');

export const getInitials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

export const truncate = (str: string, length: number) =>
  str.length > length ? `${str.slice(0, length)}...` : str;

export const generateColor = (id: string): string => {
  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#06b6d4',
  ];
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export const actionLabel: Record<string, string> = {
  CREATE: 'created',
  EDIT: 'edited',
  DELETE: 'deleted',
  RESTORE: 'restored',
  EXPORT: 'exported',
  LOGIN: 'logged in',
  LOGOUT: 'logged out',
  INVITE: 'invited',
};
