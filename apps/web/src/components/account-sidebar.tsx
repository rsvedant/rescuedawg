"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Settings, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Settings", href: "/account/settings", icon: Settings },
  { name: "Security", href: "/account/security", icon: Shield },
]

export function AccountSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-background lg:block">
      <div className="flex h-full flex-col gap-y-5 overflow-y-auto px-6 pt-20">
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <div className="mb-2">
                <h2 className="text-xs font-semibold leading-6 text-muted-foreground uppercase tracking-wider">
                  Account
                </h2>
              </div>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href)
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          isActive
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                          "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium transition-colors"
                        )}
                      >
                        <item.icon
                          className={cn(
                            isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                            "h-5 w-5 shrink-0"
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  )
}
