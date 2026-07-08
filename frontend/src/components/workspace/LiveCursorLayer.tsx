import { useWorkspaceStore } from '@/store/workspace';
import { useAuthStore } from '@/store/auth';
import { motion, AnimatePresence } from 'framer-motion';

export function LiveCursorLayer() {
  const { cursors } = useWorkspaceStore();
  const { user } = useAuthStore();

  const otherCursors = Array.from(cursors.values()).filter((c) => c.userId !== user?.id);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {otherCursors.map((cursor) => (
          <motion.div
            key={cursor.userId}
            className="collab-cursor"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1, x: cursor.x, y: cursor.y }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25, mass: 0.5 }}
          >
            {/* Cursor SVG */}
            <svg width="16" height="22" viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M0.5 0.5L0.5 15.5L4.5 11.5L7.5 19.5L9.5 18.5L6.5 10.5L12.5 10.5L0.5 0.5Z"
                fill={cursor.userColor}
                stroke="white"
                strokeWidth="1"
              />
            </svg>
            {/* Name flag */}
            <div
              className="collab-cursor-flag whitespace-nowrap text-[11px] font-semibold shadow-sm"
              style={{ backgroundColor: cursor.userColor }}
            >
              {cursor.userName}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
