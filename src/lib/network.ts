"use client";

export type NetworkStatus = {
  online: boolean;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
};

export type NetworkQuality = "excellent" | "good" | "fair" | "poor" | "offline";

class NetworkMonitor {
  private listeners: Set<(status: NetworkStatus) => void> = new Set();
  private isClient: boolean;

  constructor() {
    this.isClient = typeof window !== "undefined";

    if (this.isClient) {
      // Initial status
      this.getNetworkStatus();

      // Add event listeners
      window.addEventListener("online", () => this.updateStatus());
      window.addEventListener("offline", () => this.updateStatus());

      // Monitor connection changes if supported
      if ("connection" in navigator) {
        const connection = (navigator as any).connection;
        connection?.addEventListener("change", () => this.updateStatus());
      }
    }
  }

  getNetworkStatus(): NetworkStatus {
    if (!this.isClient) {
      return {
        online: true,
        effectiveType: "unknown",
        downlink: 0,
        rtt: 0,
        saveData: false,
      };
    }

    const connection = (navigator as any).connection;

    return {
      online: navigator.onLine,
      effectiveType: connection?.effectiveType || "unknown",
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
      saveData: connection?.saveData || false,
    };
  }

  getQuality(): NetworkQuality {
    if (!this.isClient) return "good";

    const status = this.getNetworkStatus();

    if (!status.online) return "offline";

    if (status.effectiveType === "4g" && status.rtt < 100) {
      return "excellent";
    } else if (
      status.effectiveType === "4g" ||
      (status.effectiveType === "3g" && status.rtt < 200)
    ) {
      return "good";
    } else if (
      status.effectiveType === "3g" ||
      (status.effectiveType === "2g" && status.rtt < 400)
    ) {
      return "fair";
    } else {
      return "poor";
    }
  }

  subscribe(callback: (status: NetworkStatus) => void) {
    if (!this.isClient) return () => {};

    this.listeners.add(callback);
    callback(this.getNetworkStatus());
    return () => this.listeners.delete(callback);
  }

  private updateStatus() {
    if (!this.isClient) return;

    const status = this.getNetworkStatus();
    this.listeners.forEach((listener) => listener(status));
  }
}

export const networkMonitor = new NetworkMonitor();
