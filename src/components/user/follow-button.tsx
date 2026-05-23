"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FollowButtonProps {
  username: string;
  initialFollowing?: boolean;
  initialFollowersCount?: number;
  onFollowChange?: (following: boolean, followersCount: number) => void;
}

export function FollowButton({
  username,
  initialFollowing = false,
  initialFollowersCount = 0,
  onFollowChange,
}: FollowButtonProps) {
  const { data: session } = useSession();
  const [following, setFollowing] = useState(initialFollowing);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!session?.user) return;
    // Fetch live state on mount
    fetch(`/api/users/${username}/follow`)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.isFollowing === "boolean") setFollowing(d.isFollowing);
        if (typeof d.followersCount === "number") setFollowersCount(d.followersCount);
      })
      .catch(() => {});
  }, [session?.user, username]);

  if (!mounted || !session?.user || session.user.username === username) return null;

  const toggle = async () => {
    setLoading(true);
    const method = following ? "DELETE" : "POST";
    try {
      const res = await fetch(`/api/users/${username}/follow`, { method });
      if (!res.ok) throw new Error();
      const newFollowing = !following;
      const newCount = followersCount + (newFollowing ? 1 : -1);
      setFollowing(newFollowing);
      setFollowersCount(newCount);
      onFollowChange?.(newFollowing, newCount);
      toast.success(newFollowing ? `Following @${username}` : `Unfollowed @${username}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={following ? "outline" : "default"}
      size="sm"
      onClick={toggle}
      disabled={loading}
      className="gap-1.5"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : following ? (
        <UserMinus className="h-3.5 w-3.5" />
      ) : (
        <UserPlus className="h-3.5 w-3.5" />
      )}
      {following ? "Following" : "Follow"}
    </Button>
  );
}
