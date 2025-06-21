import React from 'react';
import { ArrowRightIcon } from '../svg';
import Link from 'next/link';
const StartBuilding = () => {
  return (
    <section className="start-building-container">
      <main>
        <div className="pill">Ready to scale?</div>
        <div className="big-text">The only multi-chain oracle you need</div>
        <Link
          href="https://docs.ifalabs.com"
          target="_blank"
        >
          <button>
            Start Building <ArrowRightIcon />
          </button>
        </Link>
      </main>
    </section>
  );
};

export default StartBuilding;
