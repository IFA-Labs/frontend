import React from 'react';
import { ArrowRightIcon } from '../svg';
import Link from 'next/link';
const StartBuilding = () => {
  return (
    <section className="start-building-container">
      <div className="pill">Ready to scale?</div>
      <div className="big-text">The only multi-chain oracle you need</div>
      <Link href="https://github.com/IFA-Labs/oracle_contract" target="_blank">
        <button>
          Start Building <ArrowRightIcon />
        </button>
      </Link>
    </section>
  );
};

export default StartBuilding;
