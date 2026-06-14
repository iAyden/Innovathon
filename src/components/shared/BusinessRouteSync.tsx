"use client";

import { useEffect } from "react";
import { useBusiness } from "@/contexts/BusinessContext";

export function BusinessRouteSync({ orgId }: { orgId: string }) {
  const { setActiveBusinessId } = useBusiness();

  useEffect(() => {
    setActiveBusinessId(orgId);
  }, [orgId, setActiveBusinessId]);

  return null;
}
