import React from "react";
import desktopIcon from "./desktop.png";
import hubIcon from './hub.png'
import routerIcon from './wireless-router.png'

interface HostIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: number;
}

interface SwitchIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: number;
}

interface RouterIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: number;
}

export const HostIcon: React.FC<HostIconProps> = ({ size = 32, ...props }) => {
  return (
    <img
      src={desktopIcon}
      width={size}
      height={size}
      alt="Host device icon"
      {...props}
    />
  );
};

export const SwitchIcon: React.FC<HostIconProps> = ({ size = 32, ...props }) => {
  return (
    <img
      src={hubIcon}
      width={size}
      height={size}
      alt="Host device icon"
      {...props}
    />
  );
};

export const RouterIcon: React.FC<HostIconProps> = ({ size = 32, ...props }) => {
  return (
    <img
      src={routerIcon}
      width={size}
      height={size}
      alt="Host device icon"
      {...props}
    />
  );
};