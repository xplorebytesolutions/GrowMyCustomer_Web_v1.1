// 📄 File: src/pages/Contacts/components/dropdown-menu.jsx
import {
  Menu,
  MenuButton,
  MenuItems,
  MenuItem,
  Transition,
} from "@headlessui/react";
import { Fragment } from "react";

export function DropdownMenu({ children }) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      {children}
    </Menu>
  );
}

export const DropdownMenuTrigger = ({ asChild, children }) => (
  <MenuButton as={Fragment}>{children}</MenuButton>
);

export const DropdownMenuContent = ({ children, className = "" }) => (
  <Transition
    as={Fragment}
    enter="transition ease-out duration-100"
    enterFrom="transform opacity-0 scale-95"
    enterTo="transform opacity-100 scale-100"
    leave="transition ease-in duration-75"
    leaveFrom="transform opacity-100 scale-100"
    leaveTo="transform opacity-0 scale-95"
  >
    <MenuItems
      className={`absolute right-0 z-10 mt-2 w-48 origin-top-right overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg focus:outline-none ${className}`}
    >
      {children}
    </MenuItems>
  </Transition>
);

export const DropdownMenuItem = ({ children, onClick, className = "" }) => (
  <MenuItem>
    {({ active }) => (
      <button
        onClick={onClick}
        className={`${
          active ? "bg-slate-50" : ""
        } w-full px-4 py-2 text-left text-sm text-slate-700 ${className}`}
      >
        {children}
      </button>
    )}
  </MenuItem>
);

// // 📄 File: src/pages/Contacts/components/dropdown-menu.jsx
// import {
//   Menu,
//   MenuButton,
//   MenuItems,
//   MenuItem,
//   Transition,
// } from "@headlessui/react";
// import { Fragment } from "react";

// export function DropdownMenu({ children }) {
//   return (
//     <Menu as="div" className="relative inline-block text-left">
//       {children}
//     </Menu>
//   );
// }

// export const DropdownMenuTrigger = ({ asChild, children }) => (
//   <MenuButton as={Fragment}>{children}</MenuButton>
// );

// export const DropdownMenuContent = ({ children, className = "" }) => (
//   <Transition
//     as={Fragment}
//     enter="transition ease-out duration-100"
//     enterFrom="transform opacity-0 scale-95"
//     enterTo="transform opacity-100 scale-100"
//     leave="transition ease-in duration-75"
//     leaveFrom="transform opacity-100 scale-100"
//     leaveTo="transform opacity-0 scale-95"
//   >
//     <MenuItems
//       className={`absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none ${className}`}
//     >
//       {children}
//     </MenuItems>
//   </Transition>
// );

// export const DropdownMenuItem = ({ children, onClick, className = "" }) => (
//   <MenuItem>
//     {({ active }) => (
//       <button
//         onClick={onClick}
//         className={`${
//           active ? "bg-gray-100" : ""
//         } w-full px-4 py-2 text-sm text-left ${className}`}
//       >
//         {children}
//       </button>
//     )}
//   </MenuItem>
// );
