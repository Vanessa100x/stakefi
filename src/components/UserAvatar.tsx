/* eslint-disable @next/next/no-img-element */
import { User as UserIcon } from "lucide-react";

interface UserAvatarProps {
    src?: string | null;
    alt?: string;
    size?: "sm" | "md" | "lg" | "xl";
    className?: string;
}

export function UserAvatar({ src, alt, size = "md", className = "" }: UserAvatarProps) {
    const sizeClasses = {
        sm: "w-8 h-8",
        md: "w-10 h-10",
        lg: "w-16 h-16",
        xl: "w-32 h-32"
    };

    if (src) {
        return (
            <img
                src={src}
                alt={alt || "User Avatar"}
                className={`rounded-full object-cover border border-white/10 ${sizeClasses[size]} ${className}`}
            />
        );
    }

    return (
        <div className={`rounded-full bg-gradient-to-br from-[var(--bg-dark)] to-gray-800 flex items-center justify-center border border-white/10 ${sizeClasses[size]} ${className}`}>
            <UserIcon className="text-gray-400 w-1/2 h-1/2" />
        </div>
    );
}
