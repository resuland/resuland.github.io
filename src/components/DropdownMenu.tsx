import React, { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import {
  IoEllipsisVertical,
  IoLogoGithub,
  IoLogoGitlab,
  IoLogoRss,
} from 'react-icons/io5/index.js'

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function DropdownMenu() {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="transition-color" aria-label="menu">
          <IoEllipsisVertical />
        </Menu.Button>
      </div>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="trasform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items
          className={
            'absolute right-0 z-10 mt-2 w-60 origin-top-right rounded-md border border-zinc-400 dark:border-zinc-700 bg-orange-50 dark:bg-zinc-800 shadow-xl ring-1, ring-black ring-opacity-5 focus:outline-none divide-zinc-400 dark:divide-zinc-700'
          }
        >
          <Menu.Item>
            <button className="flex w-full items-center rounded-md p-2 gap-2 hover:opacity-80 active:opacity-50">
              <IoLogoRss />
              Blog
            </button>
          </Menu.Item>
          <Menu.Item>
            <button className="flex w-full items-center rounded-md p-2 gap-2 hover:opacity-80 active:opacity-50">
              <IoLogoGithub />
              Github
            </button>
          </Menu.Item>
          <Menu.Item>
            <button className="flex w-full items-center rounded-md p-2 gap-2 hover:opacity-80 active:opacity-50">
              <IoLogoGitlab />
              Gitlab
            </button>
          </Menu.Item>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}
