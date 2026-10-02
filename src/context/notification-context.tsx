import React from "react";
import React, { createContext, useContext, useState, useCallback } from "react";
import { haptic } from "@/lib/haptics";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface Notification {
  id: string;
  message: string;
  description?: string;
  type: NotificationType;
  duration?: number;
  timestamp: number;
}

interface NotificationContextType {
  notifications: Notification[];
  history: Notification[];
  showNotification: (n: Omit<Notification, "id" | "timestamp">) => void;
  hideNotification: (id: string) => void;
  clearHistory: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [history, setHistory] = useState<Notification[]>([]);

  const hideNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const showNotification = useCallback(
    ({ message, description, type, duration = 4000 }: Omit<Notification, "id" | "timestamp">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const timestamp = Date.now();
      const n = { id, message, description, type, duration, timestamp };
      
      // Map notification type to haptic feedback
      if (type === "success") haptic("success");
      else if (type === "warning") haptic("warning");
      else if (type === "error") haptic("error");
      else haptic("light");

      setNotifications((prev) => [...prev, n]);
      setHistory((prev) => [n, ...prev].slice(0, 20)); // Keep last 20

      if (duration !== Infinity) {
        setTimeout(() => hideNotification(id), duration);
      }
    },
    [hideNotification]
  );

  return (
    <NotificationContext.Provider value={{ notifications, history, showNotification, hideNotification, clearHistory }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
