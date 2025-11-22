"use client";
import Link from "next/link";
import { ModeToggle } from "./mode-toggle";

export default function Header() {
	const links = [
		{ to: "/", label: "Home" },
		{ to: "/dashboard", label: "Dashboard" },
	] as const;

	return (
		<header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
			<div className="flex flex-row items-center justify-between px-6 py-4">
				<nav className="flex gap-6 text-sm font-medium">
					{links.map(({ to, label }) => {
						return (
							<Link
								key={to}
								href={to}
								className="transition-colors hover:text-foreground/80 text-foreground/60"
							>
								{label}
							</Link>
						);
					})}
				</nav>
				<div className="flex items-center gap-3">
					<ModeToggle />
				</div>
			</div>
		</header>
	);
}
