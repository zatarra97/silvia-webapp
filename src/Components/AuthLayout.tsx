import React from "react"

interface AuthLayoutProps {
	children: React.ReactNode
}

// Punti mostrati nel pannello di presentazione: raccontano cosa contiene il
// registro, con le stesse icone usate nella sidebar dell'area clinica.
const HIGHLIGHTS = [
	{
		icon: "fa-solid fa-hospital-user",
		title: "Cartelle paziente",
		text: "Reparto, degenza, SOFA e indice di Charlson in un'unica scheda.",
	},
	{
		icon: "fa-solid fa-bacterium",
		title: "Patogeni e resistenze",
		text: "Emocolture, complicanze infettive, profili di resistenza e antibiogrammi.",
	},
	{
		icon: "fa-solid fa-chart-line",
		title: "Casistica esportabile",
		text: "Export Excel e PDF con i dizionari delle codifiche già inclusi.",
	},
]

// Marchio applicativo: stesso simbolo e stesso nome della sidebar.
const BrandMark: React.FC<{ compact?: boolean }> = ({ compact }) => (
	<div className="flex items-center gap-3">
		<span
			className={`auth-mark flex items-center justify-center shrink-0 rounded-xl ${
				compact ? "w-10 h-10 text-base" : "w-12 h-12 text-xl"
			}`}
		>
			<i className="fa-solid fa-staff-snake" aria-hidden />
		</span>
		<span className="leading-tight">
			<span className={`block font-bold tracking-tight ${compact ? "text-base" : "text-lg"}`}>SIS Medical</span>
			<span className={`block ${compact ? "text-[11px]" : "text-xs"} auth-mark-caption tracking-wide`}>
				Registro batteriemie da Gram-negativi
			</span>
		</span>
	</div>
)

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
	return (
		<div className="auth-page min-h-screen w-full lg:grid lg:grid-cols-[1.1fr_1fr]">
			{/* ── Pannello di presentazione (solo desktop) ───────────────── */}
			<aside className="auth-brand hidden lg:flex flex-col justify-between p-12 xl:p-16 pb-28 xl:pb-28 text-white">
				<div className="relative z-10 text-white">
					<BrandMark />
				</div>

				<div className="relative z-10 max-w-md">
					<h2 className="text-3xl xl:text-4xl font-semibold leading-snug tracking-tight">
						Il registro clinico delle
						<br />
						batteriemie del reparto.
					</h2>
					<p className="mt-4 text-sm leading-relaxed text-slate-300">
						Raccolta strutturata dei casi di infezione del torrente ematico: dati del paziente, isolati microbiologici,
						sensibilità agli antibiotici e terapia, pronti per l'analisi.
					</p>

					<ul className="mt-10 space-y-5">
						{HIGHLIGHTS.map((item) => (
							<li key={item.title} className="flex items-start gap-4">
								<span className="auth-highlight-icon flex items-center justify-center shrink-0 w-9 h-9 rounded-lg text-sm">
									<i className={item.icon} aria-hidden />
								</span>
								<span>
									<span className="block text-sm font-semibold text-white">{item.title}</span>
									<span className="block text-sm text-slate-400 leading-relaxed">{item.text}</span>
								</span>
							</li>
						))}
					</ul>
				</div>

				<div className="relative z-10 flex items-center gap-2 text-xs text-slate-400">
					<i className="fa-solid fa-lock text-[10px]" aria-hidden />
					Accesso riservato al personale sanitario autorizzato
				</div>

				{/* Tracciato ECG decorativo */}
				<svg className="auth-ecg" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden focusable="false">
					<path
						className="auth-ecg-line"
						d="M0 60 H180 l18 -34 l16 68 l18 -52 l14 18 H430 l22 -40 l16 74 l18 -56 l14 22 H700 l20 -36 l16 70 l18 -54 l14 20 H980 l20 -30 l16 60 l18 -46 l12 16 H1200"
						fill="none"
					/>
				</svg>
			</aside>

			{/* ── Pannello del form ──────────────────────────────────────── */}
			<main className="auth-form-panel flex flex-col min-h-screen lg:min-h-0 px-5 py-10 sm:px-10 lg:px-12">
				{/* Marchio compatto: sostituisce il pannello di sinistra su mobile */}
				<div className="lg:hidden auth-brand-compact mx-auto w-full max-w-[420px]">
					<BrandMark compact />
				</div>

				<div className="flex-1 flex items-center justify-center">
					<div className="auth-card w-full max-w-[420px]">{children}</div>
				</div>

				<p className="mt-8 text-center text-xs text-slate-400">
					SIS Medical · v{__APP_VERSION__}
				</p>
			</main>
		</div>
	)
}

export default AuthLayout
