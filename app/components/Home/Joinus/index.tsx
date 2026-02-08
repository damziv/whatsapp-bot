'use client'
import React from 'react'

const Join = () => {
  return (
    <section id="Contact" className="overflow-hidden bg-joinus">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="text-center">
          <p className="text-primary text-lg font-normal tracking-widest uppercase">
            Kontaktirajte nas
          </p>

          <h2 className="my-6">Obratite se QReventu</h2>

          <p className="text-black/50 text-base font-normal max-w-3xl mx-auto">
          Imate pitanja o korištenju QReventa za vjenčanje ili događaj? Rado ćemo pomoći.
          </p>
        </div>

        <div className="mx-auto max-w-3xl pt-12">
          <div className="rounded-2xl bg-grey p-10 text-center space-y-6">
            <div>
              <p className="text-sm uppercase tracking-widest text-black/50 mb-2">
                Email
              </p>
              <a
                href="mailto:zivkusic@gmail.com"
                className="text-2xl font-semibold text-black hover:text-primary transition"
              >
                zivkusic@gmail.com
              </a>
            </div>

            <div>
              <p className="text-sm uppercase tracking-widest text-black/50 mb-2">
                Mob:
              </p>
              <a
                href="tel:+385XXXXXXXXX"
                className="text-2xl font-semibold text-black hover:text-primary transition"
              >
                +385 99 539 6468
              </a>
            </div>

            <p className="text-sm text-black/40 pt-4">
              Dostupni smo preko email-a i WhatsApp aplikacije
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Join
