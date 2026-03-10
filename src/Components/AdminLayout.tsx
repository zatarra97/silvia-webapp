import React, { useState } from "react"
import { NavLink } from "react-router-dom"

interface AdminLayoutProps {
	children: React.ReactNode
	userEmail: string
	onLogout: () => void
}

const NAV_ITEMS = [
	{ to: "/admin",                        icon: "fa-solid fa-gauge",          label: "Dashboard",               end: true  },
	{ to: "/admin/patients",               icon: "fa-solid fa-hospital-user",  label: "Patients",                end: false },
	{ to: "/admin/wards",                  icon: "fa-solid fa-bed",            label: "Wards of admission",      end: false },
	{ to: "/admin/sites",                  icon: "fa-solid fa-vials",          label: "Sites of isolation",      end: false },
	{ to: "/admin/antimicrobial-therapies", icon: "fa-solid fa-pills",         label: "Antimicrobial therapies", end: false },
	{ to: "/admin/bsi-pathogens",          icon: "fa-solid fa-bacterium",      label: "BSI pathogens",           end: false },
	{ to: "/admin/resistance-profiles",    icon: "fa-solid fa-shield-virus",   label: "Resistance profiles",     end: false },
	{ to: "/admin/ast-antibiotics",        icon: "fa-solid fa-capsules",       label: "Antibiotics",             end: false },
]

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, userEmail, onLogout }) => {
	const [expanded, setExpanded] = useState(true)

	const avatarLetter = userEmail.charAt(0).toUpperCase()

	return (
		<div className="flex h-screen overflow-hidden bg-[#f0f2f8]">

			{/* ── Sidebar ──────────────────────────────────────────────── */}
			<aside
				className={`flex flex-col shrink-0 bg-white border-r border-gray-200 transition-all duration-300 ${
					expanded ? "w-60" : "w-[68px]"
				}`}
			>
				{/* Logo */}
				<div
					className={`flex items-center h-16 shrink-0 border-b border-gray-100 ${
						expanded ? "px-5 gap-2.5" : "justify-center px-4"
					}`}
				>
					<i className="fa-solid fa-staff-snake text-blue-600 text-lg shrink-0" aria-hidden />
					{expanded && (
						<span className="font-bold text-gray-800 text-sm tracking-wide whitespace-nowrap">
							SIS Medical
						</span>
					)}
				</div>

				{/* Nav items */}
				<nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
					{NAV_ITEMS.map((item) => (
						<NavLink
							key={item.to}
							to={item.to}
							end={item.end}
							title={!expanded ? item.label : undefined}
							className={({ isActive }) =>
								`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
									isActive
										? "bg-blue-600 text-white shadow-sm"
										: "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
								}`
							}
						>
							{() => (
								<>
									<i className={`${item.icon} w-4 text-center shrink-0`} aria-hidden />
									{expanded && <span className="flex-1 truncate">{item.label}</span>}

									{/* Tooltip per sidebar collassata */}
									{!expanded && (
										<span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
											{item.label}
										</span>
									)}
								</>
							)}
						</NavLink>
					))}
				</nav>

				{/* User info + logout */}
				<div className={`shrink-0 border-t border-gray-100 py-3 ${expanded ? "px-3" : "px-2"}`}>
					{expanded ? (
						<div className="flex items-center gap-3 px-2 py-2 rounded-lg">
							<div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-xs font-bold shrink-0">
								{avatarLetter}
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-xs font-semibold text-gray-800 truncate">{userEmail}</p>
								<p className="text-xs text-gray-400">Administrator</p>
							</div>
							<button
								onClick={onLogout}
								title="Logout"
								className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer p-1"
							>
								<i className="fa-solid fa-right-from-bracket text-sm" aria-hidden />
							</button>
						</div>
					) : (
						<div className="flex flex-col items-center gap-2">
							<div
								className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-xs font-bold"
								title={userEmail}
							>
								{avatarLetter}
							</div>
							<button
								onClick={onLogout}
								title="Logout"
								className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer p-1"
							>
								<i className="fa-solid fa-right-from-bracket text-sm" aria-hidden />
							</button>
						</div>
					)}
				</div>
			</aside>

			{/* ── Right side ───────────────────────────────────────────── */}
			<div className="flex flex-col flex-1 min-w-0">

				{/* Top bar */}
				<header className="flex items-center h-16 px-5 bg-white border-b border-gray-200 shrink-0 gap-4">
					<button
						onClick={() => setExpanded((prev) => !prev)}
						aria-label="Espandi/comprimi sidebar"
						className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
					>
						<i className="fa-solid fa-bars" aria-hidden />
					</button>

					<div className="flex-1" />

					<div className="flex items-center gap-3">
						<span className="hidden sm:block text-sm text-gray-500 sm:truncate sm:max-w-[200px] md:overflow-visible md:text-clip md:max-w-none">
							{userEmail}
						</span>
						<div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">
							{avatarLetter}
						</div>
					</div>
				</header>

				{/* Page content */}
				<main className="flex-1 min-h-0 overflow-y-auto">
					{children}
				</main>
			</div>
		</div>
	)
}

export default AdminLayout
