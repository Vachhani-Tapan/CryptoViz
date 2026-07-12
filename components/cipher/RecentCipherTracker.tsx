"use client";

import { useEffect } from "react";
import {
  loadRecentCipherIds,
  recordRecentCipher,
  saveRecentCipherIds,
} from "../../lib/utils/recentCiphers";

interface RecentCipherTrackerProps {
  cipherId: string;
}

export default function RecentCipherTracker({
  cipherId,
}: RecentCipherTrackerProps) {
  useEffect(() => {
    const current = loadRecentCipherIds();
    saveRecentCipherIds(recordRecentCipher(current, cipherId));
  }, [cipherId]);

  return null;
}
