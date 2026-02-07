'use client'
import React from 'react'
import Link from 'next/link'

const Beliefs = () => {
  return (
    <section className='bg-cover bg-center overflow-hidden'>
      <div className='container mx-auto max-w-7xl px-4'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-5'>
          {/* COLUMN-1 */}

          <div className="bg-purple pt-12 px-10 sm:px-24 pb-52 md:pb-70 rounded-3xl bg-[url('/images/beliefs/swirls.svg')] bg-no-repeat bg-right-bottom">
            <p className='text-lg font-normal text-white tracking-widest mb-5 text-center sm:text-start uppercase'>
              beliefs
            </p>
            <h3 className="text-white mb-5 text-center sm:text-start">
            Built around WhatsApp{' '}
          </h3>
              <p className="text-lg text-white/75 pt-2 mb-16 text-center sm:text-start">
                Guests already know how to send photos on WhatsApp. We simply turn that into
                a private, organized event gallery.
              </p>
            <div className='text-center sm:text-start'>
              
            </div>
          </div>

          {/* COLUMN-2 */}
          <div className=''>
            <div className="bg-[#D6FFEB] pt-12 px-10 sm:px-24 pb-52 md:pb-70 rounded-3xl bg-[url('/images/beliefs/bg.svg')] bg-no-repeat bg-bottom">
            <p className="text-lg font-normal text-primary tracking-widest mb-5 text-center sm:text-start uppercase">
              CREATE
            </p>

            <h3 className="text-black mb-5 text-center sm:text-start">
              <span className="text-primary">Create</span> a QR album in seconds.
            </h3>

            <p className="pt-2 mb-16 text-center sm:text-start text-black/75 text-lg">
              Set up a private gallery for your event and generate a unique QR code that
              guests can scan instantly.
            </p>

              <div className='text-center sm:text-start'>
               
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
export default Beliefs
