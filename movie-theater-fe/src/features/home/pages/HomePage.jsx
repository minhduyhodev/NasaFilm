import React from 'react';
import Hero from '../components/Hero';
import TicketFilters from '../components/TicketFilters';
import NowShowing from '../components/NowShowing';
import ComingSoon from '../components/ComingSoon';
import Upcoming from '../components/Upcoming';
import VIPSection from '../components/VIPSection';

const HomePage = () => {
	return (
		<div className="text-white min-h-screen">

			<main className="pt-0">
				<Hero />

				<section id="quick-booking" className="-mt-16 md:-mt-24 relative z-20 px-4 md:px-8 lg:px-20">
					<div className="max-w-6xl mx-auto">
						<TicketFilters />
					</div>
				</section>

				<section className="mt-12 px-4 md:px-8 lg:px-20">
					<div className="max-w-7xl mx-auto">
						<NowShowing />
					</div>
				</section>

				<section className="mt-16 px-4 md:px-8 lg:px-20">
					<div className="max-w-7xl mx-auto">
						<ComingSoon />
					</div>
				</section>

				<section className="mt-16 px-4 md:px-8 lg:px-20">
					<div className="max-w-6xl mx-auto">
						<Upcoming />
					</div>
				</section>

				<section className="mt-16 px-4 md:px-8 lg:px-20 mb-16">
					<div className="max-w-6xl mx-auto">
						<VIPSection />
					</div>
				</section>
			</main>
		</div>
	);
};

export default HomePage;
