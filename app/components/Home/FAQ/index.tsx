'use client'
import React from 'react'
import { Icon } from '@iconify/react'
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react'

const FAQ = () => {
  return (
    <section
      id='FAQ'
      className='relative py-1 bg-cover bg-center overflow-hidde dark:bg-darkmode'>
      <div className='container mx-auto max-w-7xl px-4'>
        <div className='relative rounded-2xl py-24 bg-faq-bg bg-no-repeat bg-cover bg-primary'>
          <p className='text-lg font-normal text-white text-center mb-6'>FAQ</p>
          <h2 className='text-white text-center max-w-3xl mx-auto'>
            Frequently asked questions.
          </h2>
          <div className="w-full px-4 pt-16">
  <div className="mx-auto w-full max-w-5xl rounded-2xl p-8 bg-white mb-5">
    <Disclosure>
      {({ open }) => (
        <div>
          <DisclosureButton className="flex w-full justify-between items-center text-left text-2xl font-medium focus:outline-hidden hover:cursor-pointer">
            <span className="text-black">
              Do guests need to install an app?
            </span>
            <div
              className={`h-5 w-5 transform transition-transform duration-300 ${
                open ? 'rotate-180' : ''
              }`}
            >
              <Icon icon="lucide:chevron-up" width="20" height="20" />
            </div>
          </DisclosureButton>

          <DisclosurePanel className="text-base text-black/50 font-normal text-left pt-4 mt-6 border-t border-border">
            <div className="lg:max-w-70%">
              No. Guests simply scan your QR code and send photos through WhatsApp.
              It works instantly on any phone — no downloads and no account creation.
            </div>
          </DisclosurePanel>
        </div>
      )}
    </Disclosure>
  </div>

  <div className="mx-auto w-full max-w-5xl rounded-2xl p-8 bg-white mb-5">
    <Disclosure as="div" className="mt-2">
      {({ open }) => (
        <>
          <DisclosureButton className="flex w-full justify-between items-center rounded-lg text-left text-2xl font-medium focus:outline-hidden hover:cursor-pointer">
            <span className="text-black">
              How do photos appear in the gallery?
            </span>
            <div
              className={`h-5 w-5 transform transition-transform duration-300 ${
                open ? 'rotate-180' : ''
              }`}
            >
              <Icon icon="lucide:chevron-up" width="20" height="20" />
            </div>
          </DisclosureButton>

          <DisclosurePanel className="text-base text-black/50 pt-4 mt-6 text-left border-t border-border">
            <div className="lg:max-w-70%">
              Guests upload photos by sending them via WhatsApp, and QRevent automatically
              collects them into your private event gallery in real time.
            </div>
          </DisclosurePanel>
        </>
      )}
    </Disclosure>
  </div>

  <div className="mx-auto w-full max-w-5xl rounded-2xl p-8 bg-white">
    <Disclosure as="div" className="mt-2">
      {({ open }) => (
        <>
          <DisclosureButton className="flex w-full justify-between items-center rounded-lg text-left text-2xl font-medium focus:outline-hidden hover:cursor-pointer">
            <span className="text-black">
              Can I download and share the gallery?
            </span>
            <div
              className={`h-5 w-5 transform transition-transform duration-300 ${
                open ? 'rotate-180' : ''
              }`}
            >
              <Icon icon="lucide:chevron-up" width="20" height="20" />
            </div>
          </DisclosureButton>

          <DisclosurePanel className="text-base text-black/50 pt-4 mt-6 font-normal text-left border-t border-border">
            <div className="lg:max-w-70%">
              Yes. You can view, download, and share your gallery anytime. It’s a single place
              for all photos from your guests — perfect after the event.
            </div>
          </DisclosurePanel>
        </>
      )}
    </Disclosure>
  </div>
</div>

        </div>
      </div>
    </section>
  )
}

export default FAQ
