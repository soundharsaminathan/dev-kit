import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { commonIconSeeds } from "./common-icon-seeds.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsPacksDir = resolve(__dirname, "../../icons-packs");
const require = createRequire(resolve(iconsPacksDir, "package.json"));

const lucide = require("lucide-react") as Record<string, unknown>;
const heroOutline = require("@heroicons/react/24/outline") as Record<
  string,
  unknown
>;
const heroSolid = require("@heroicons/react/24/solid") as Record<
  string,
  unknown
>;
const phosphor = (await import("@phosphor-icons/react")) as Record<
  string,
  unknown
>;
const tabler = require("@tabler/icons-react") as Record<string, unknown>;
const fluent = require("@fluentui/react-icons") as Record<string, unknown>;

const PACK_IDS = [
  "lucide",
  "heroicons-outline",
  "heroicons-solid",
  "phosphor-regular",
  "phosphor-fill",
  "phosphor-duotone",
  "tabler-outline",
  "tabler-filled",
  "fluent-outline",
  "fluent-filled",
  "material-symbols-outlined",
  "material-symbols-rounded",
  "material-symbols-sharp",
] as const;

type PackId = (typeof PACK_IDS)[number];
type Mapping = Record<PackId, string>;

const HERO: Record<string, string> = {
  Search: "MagnifyingGlassIcon",
  X: "XMarkIcon",
  MoreHorizontal: "EllipsisHorizontalIcon",
  MoreVertical: "EllipsisVerticalIcon",
  PanelLeft: "Bars3BottomLeftIcon",
  Loader2: "ArrowPathIcon",
  Menu: "Bars3Icon",
  Settings: "Cog6ToothIcon",
  Copy: "DocumentDuplicateIcon",
  File: "DocumentIcon",
  FileText: "DocumentTextIcon",
  FileCode: "DocumentTextIcon",
  Download: "ArrowDownTrayIcon",
  Upload: "ArrowUpTrayIcon",
  Trash2: "TrashIcon",
  Trash: "TrashIcon",
  Image: "PhotoIcon",
  CircleAlert: "ExclamationCircleIcon",
  TriangleAlert: "ExclamationTriangleIcon",
  OctagonX: "XCircleIcon",
  CircleHelp: "QuestionMarkCircleIcon",
  LogOut: "ArrowRightOnRectangleIcon",
  LogIn: "ArrowLeftOnRectangleIcon",
  Mail: "EnvelopeIcon",
  User: "UserIcon",
  Users: "UsersIcon",
  CircleUser: "UserCircleIcon",
  ExternalLink: "ArrowTopRightOnSquareIcon",
  EyeOff: "EyeSlashIcon",
  Mic: "MicrophoneIcon",
  Volume2: "SpeakerWaveIcon",
  VolumeX: "SpeakerXMarkIcon",
  Save: "DocumentArrowDownIcon",
  PenSquare: "PencilSquareIcon",
  Pencil: "PencilIcon",
  ListFilter: "FunnelIcon",
  Send: "PaperAirplaneIcon",
  HelpCircle: "QuestionMarkCircleIcon",
  GripVertical: "Bars3Icon",
  PlusSquare: "PlusCircleIcon",
  ChevronsUpDown: "ChevronUpDownIcon",
  Terminal: "CommandLineIcon",
  Minimize: "ArrowsPointingInIcon",
  Maximize: "ArrowsPointingOutIcon",
  ChartLine: "ChartBarIcon",
  Lock: "LockClosedIcon",
  Unlock: "LockOpenIcon",
  List: "ListBulletIcon",
  Info: "InformationCircleIcon",
  Timer: "ClockIcon",
  Palette: "SwatchIcon",
  Monitor: "ComputerDesktopIcon",
  Smartphone: "DevicePhoneMobileIcon",
  PhoneCall: "PhoneIcon",
  Code: "CodeBracketIcon",
  Database: "CircleStackIcon",
  GitBranch: "CodeBracketSquareIcon",
  Globe: "GlobeAltIcon",
  Building2: "BuildingOffice2Icon",
  RefreshCw: "ArrowPathIcon",
  RotateCw: "ArrowPathIcon",
  LayoutGrid: "Squares2X2Icon",
  Layout: "RectangleGroupIcon",
  Table: "TableCellsIcon",
  ChartBar: "ChartBarSquareIcon",
  ChartPie: "ChartPieIcon",
  ZoomIn: "MagnifyingGlassPlusIcon",
  ZoomOut: "MagnifyingGlassMinusIcon",
  Bluetooth: "SignalIcon",
  Paperclip: "PaperClipIcon",
  MessageSquare: "ChatBubbleLeftIcon",
  Archive: "ArchiveBoxIcon",
  Zap: "BoltIcon",
  Lightbulb: "LightBulbIcon",
  Bot: "CpuChipIcon",
  Wand: "SparklesIcon",
  Pin: "BookmarkIcon",
  Activity: "BoltIcon",
  Shield: "ShieldCheckIcon",
  Languages: "LanguageIcon",
  Smile: "FaceSmileIcon",
  BadgeCheck: "CheckBadgeIcon",
  ClipboardPaste: "ClipboardDocumentIcon",
  TrendingUp: "ArrowTrendingUpIcon",
  Circle: "CircleStackIcon",
  CircleDashed: "CircleStackIcon",
  LifeBuoy: "QuestionMarkCircleIcon",
  Keyboard: "CommandLineIcon",
};

const PHOSPHOR: Record<string, string> = {
  Search: "MagnifyingGlassIcon",
  X: "XIcon",
  ChevronLeft: "CaretLeftIcon",
  ChevronRight: "CaretRightIcon",
  ChevronDown: "CaretDownIcon",
  ChevronUp: "CaretUpIcon",
  ChevronsUpDown: "CaretUpDownIcon",
  MoreHorizontal: "DotsThreeIcon",
  MoreVertical: "DotsThreeVerticalIcon",
  PanelLeft: "SidebarIcon",
  Loader2: "CircleNotchIcon",
  Home: "HouseIcon",
  Settings: "GearIcon",
  Download: "DownloadSimpleIcon",
  Upload: "UploadSimpleIcon",
  Menu: "HamburgerIcon",
  Mail: "EnvelopeIcon",
  User: "UserIcon",
  Users: "UsersIcon",
  CircleUser: "UserCircleIcon",
  Send: "PaperPlaneTiltIcon",
  Copy: "CopyIcon",
  List: "ListIcon",
  Info: "InfoIcon",
  Lock: "LockIcon",
  Unlock: "LockOpenIcon",
  RefreshCw: "ArrowClockwiseIcon",
  RotateCw: "ArrowClockwiseIcon",
  File: "FileIcon",
  FileText: "FileTextIcon",
  FileCode: "FileCodeIcon",
  ExternalLink: "ArrowSquareOutIcon",
  PlusSquare: "PlusSquareIcon",
  Terminal: "TerminalIcon",
  Code: "CodeIcon",
  GitBranch: "GitBranchIcon",
  Server: "HardDrivesIcon",
  Database: "DatabaseIcon",
  Cloud: "CloudIcon",
  Wifi: "WifiHighIcon",
  Bluetooth: "BluetoothIcon",
  Paperclip: "PaperclipIcon",
  MessageSquare: "ChatCircleIcon",
  Inbox: "TrayIcon",
  Archive: "ArchiveIcon",
  LogIn: "SignInIcon",
  Map: "MapTrifoldIcon",
  Globe: "GlobeIcon",
  Building2: "BankIcon",
  Zap: "LightningIcon",
  Lightbulb: "LightbulbIcon",
  Bot: "RobotIcon",
  Wand: "MagicWandIcon",
  Sparkles: "SparkleIcon",
  Pin: "PushPinIcon",
  GripVertical: "DotsSixVerticalIcon",
  Maximize: "ArrowsOutIcon",
  Minimize: "ArrowsInIcon",
  ZoomIn: "MagnifyingGlassPlusIcon",
  ZoomOut: "MagnifyingGlassMinusIcon",
  Bold: "TextBIcon",
  Italic: "TextItalicIcon",
  Underline: "TextUnderlineIcon",
  Clipboard: "ClipboardIcon",
  ClipboardPaste: "ClipboardTextIcon",
  Scissors: "ScissorsIcon",
  ChartLine: "ChartLineIcon",
  ChartBar: "ChartBarIcon",
  ChartPie: "ChartPieIcon",
  TrendingUp: "TrendUpIcon",
  Activity: "PulseIcon",
  Calculator: "CalculatorIcon",
  Shield: "ShieldIcon",
  Keyboard: "KeyboardIcon",
  Languages: "TranslateIcon",
  BookOpen: "BookOpenIcon",
  LifeBuoy: "LifebuoyIcon",
  BadgeCheck: "SealCheckIcon",
  Smile: "SmileyIcon",
  Circle: "CircleIcon",
  CircleDashed: "CircleDashedIcon",
  OctagonX: "WarningOctagonIcon",
  Timer: "TimerIcon",
  Palette: "PaletteIcon",
  Monitor: "MonitorIcon",
  Smartphone: "DeviceMobileIcon",
  PhoneCall: "PhoneCallIcon",
  ShoppingBag: "ShoppingBagIcon",
  ShoppingCart: "ShoppingCartIcon",
  CreditCard: "CreditCardIcon",
  Wallet: "WalletIcon",
  Camera: "CameraIcon",
  Bookmark: "BookmarkIcon",
  Tag: "TagIcon",
  Star: "StarIcon",
  Heart: "HeartIcon",
  Sun: "SunIcon",
  Moon: "MoonIcon",
  Bell: "BellIcon",
  Eye: "EyeIcon",
  EyeOff: "EyeSlashIcon",
  Link: "LinkIcon",
  Share: "ShareIcon",
  Folder: "FolderIcon",
  FolderOpen: "FolderOpenIcon",
  FolderPlus: "FolderPlusIcon",
  LayoutGrid: "GridFourIcon",
  XCircle: "XCircleIcon",
  CheckCircle2: "CheckCircleIcon",
  Mic: "MicrophoneIcon",
  Volume2: "SpeakerHighIcon",
  VolumeX: "SpeakerXIcon",
  ArrowLeft: "ArrowLeftIcon",
  ArrowRight: "ArrowRightIcon",
  ArrowUp: "ArrowUpIcon",
  ArrowDown: "ArrowDownIcon",
  ArrowUpRight: "ArrowUpRightIcon",
  Image: "ImageIcon",
  CircleHelp: "QuestionIcon",
  HelpCircle: "QuestionIcon",
  LogOut: "SignOutIcon",
  Edit: "PencilIcon",
  Pencil: "PencilIcon",
  PenSquare: "PencilSimpleLineIcon",
  Save: "FloppyDiskIcon",
  CircleAlert: "WarningCircleIcon",
  TriangleAlert: "WarningIcon",
  CircleCheck: "CheckCircleIcon",
  Trash2: "TrashIcon",
  Trash: "TrashIcon",
  MapPin: "MapPinIcon",
  Filter: "FunnelIcon",
  ListFilter: "FunnelIcon",
};

const FLUENT: Record<string, { outline: string; filled: string }> = {
  Search: { outline: "SearchRegular", filled: "SearchFilled" },
  X: { outline: "DismissRegular", filled: "DismissFilled" },
  Check: { outline: "CheckmarkRegular", filled: "CheckmarkFilled" },
  Minus: { outline: "SubtractRegular", filled: "SubtractFilled" },
  Plus: { outline: "AddRegular", filled: "AddFilled" },
  MoreHorizontal: {
    outline: "MoreHorizontalRegular",
    filled: "MoreHorizontalFilled",
  },
  MoreVertical: {
    outline: "MoreVerticalRegular",
    filled: "MoreVerticalFilled",
  },
  PanelLeft: { outline: "PanelLeftRegular", filled: "PanelLeftFilled" },
  Loader2: {
    outline: "ArrowClockwiseRegular",
    filled: "ArrowClockwiseFilled",
  },
  Home: { outline: "HomeRegular", filled: "HomeFilled" },
  Settings: { outline: "SettingsRegular", filled: "SettingsFilled" },
  Menu: { outline: "NavigationRegular", filled: "NavigationFilled" },
  PlusSquare: { outline: "AddSquareRegular", filled: "AddSquareFilled" },
  ChevronsUpDown: {
    outline: "ChevronUpDownRegular",
    filled: "ChevronUpDownFilled",
  },
  Timer: { outline: "TimerRegular", filled: "TimerFilled" },
  File: { outline: "DocumentRegular", filled: "DocumentFilled" },
  Download: {
    outline: "ArrowDownloadRegular",
    filled: "ArrowDownloadFilled",
  },
  Upload: { outline: "ArrowUploadRegular", filled: "ArrowUploadFilled" },
  Trash2: { outline: "DeleteRegular", filled: "DeleteFilled" },
  Trash: { outline: "DeleteRegular", filled: "DeleteFilled" },
  Mail: { outline: "MailRegular", filled: "MailFilled" },
  User: { outline: "PersonRegular", filled: "PersonFilled" },
  Users: { outline: "PeopleRegular", filled: "PeopleFilled" },
  CircleUser: {
    outline: "PersonCircleRegular",
    filled: "PersonCircleFilled",
  },
  Bell: { outline: "AlertRegular", filled: "AlertFilled" },
  Calendar: { outline: "CalendarRegular", filled: "CalendarFilled" },
  Clock: { outline: "ClockRegular", filled: "ClockFilled" },
  Eye: { outline: "EyeRegular", filled: "EyeFilled" },
  EyeOff: { outline: "EyeOffRegular", filled: "EyeOffFilled" },
  Star: { outline: "StarRegular", filled: "StarFilled" },
  Heart: { outline: "HeartRegular", filled: "HeartFilled" },
  Lock: { outline: "LockClosedRegular", filled: "LockClosedFilled" },
  Unlock: { outline: "LockOpenRegular", filled: "LockOpenFilled" },
  Link: { outline: "LinkRegular", filled: "LinkFilled" },
  Share: { outline: "ShareRegular", filled: "ShareFilled" },
  Copy: { outline: "CopyRegular", filled: "CopyFilled" },
  Save: { outline: "SaveRegular", filled: "SaveFilled" },
  Edit: { outline: "EditRegular", filled: "EditFilled" },
  Pencil: { outline: "EditRegular", filled: "EditFilled" },
  PenSquare: { outline: "EditRegular", filled: "EditFilled" },
  Folder: { outline: "FolderRegular", filled: "FolderFilled" },
  Image: { outline: "ImageRegular", filled: "ImageFilled" },
  Terminal: { outline: "WindowConsoleRegular", filled: "WindowConsoleFilled" },
  LogIn: { outline: "DoorArrowRightRegular", filled: "DoorArrowRightFilled" },
  ChartLine: { outline: "DataLineRegular", filled: "DataLineFilled" },
  ChartBar: {
    outline: "ChartMultipleRegular",
    filled: "ChartMultipleFilled",
  },
  ChartPie: { outline: "DataPieRegular", filled: "DataPieFilled" },
  LifeBuoy: { outline: "PersonSupportRegular", filled: "PersonSupportFilled" },
  OctagonX: { outline: "DismissCircleRegular", filled: "DismissCircleFilled" },
  Minimize: {
    outline: "FullScreenMinimizeRegular",
    filled: "FullScreenMinimizeFilled",
  },
  Info: { outline: "InfoRegular", filled: "InfoFilled" },
  CircleAlert: { outline: "ErrorCircleRegular", filled: "ErrorCircleFilled" },
  TriangleAlert: {
    outline: "WarningRegular",
    filled: "WarningFilled",
  },
  HelpCircle: {
    outline: "QuestionCircleRegular",
    filled: "QuestionCircleFilled",
  },
  CircleHelp: {
    outline: "QuestionCircleRegular",
    filled: "QuestionCircleFilled",
  },
  Sun: { outline: "WeatherSunnyRegular", filled: "WeatherSunnyFilled" },
  Moon: { outline: "WeatherMoonRegular", filled: "WeatherMoonFilled" },
  LogOut: { outline: "SignOutRegular", filled: "SignOutFilled" },
  Send: { outline: "SendRegular", filled: "SendFilled" },
  RefreshCw: {
    outline: "ArrowClockwiseRegular",
    filled: "ArrowClockwiseFilled",
  },
  ChevronLeft: {
    outline: "ChevronLeftRegular",
    filled: "ChevronLeftFilled",
  },
  ChevronRight: {
    outline: "ChevronRightRegular",
    filled: "ChevronRightFilled",
  },
  ChevronDown: {
    outline: "ChevronDownRegular",
    filled: "ChevronDownFilled",
  },
  ChevronUp: { outline: "ChevronUpRegular", filled: "ChevronUpFilled" },
  ExternalLink: {
    outline: "OpenRegular",
    filled: "OpenFilled",
  },
  Filter: { outline: "FilterRegular", filled: "FilterFilled" },
  ListFilter: { outline: "FilterRegular", filled: "FilterFilled" },
  Mic: { outline: "MicRegular", filled: "MicFilled" },
  Camera: { outline: "CameraRegular", filled: "CameraFilled" },
  Wifi: { outline: "Wifi1Regular", filled: "Wifi1Filled" },
  Bluetooth: { outline: "BluetoothRegular", filled: "BluetoothFilled" },
  Cloud: { outline: "CloudRegular", filled: "CloudFilled" },
  Database: { outline: "DatabaseRegular", filled: "DatabaseFilled" },
  Server: { outline: "ServerRegular", filled: "ServerFilled" },
  Code: { outline: "CodeRegular", filled: "CodeFilled" },
  Globe: { outline: "GlobeRegular", filled: "GlobeFilled" },
  Map: { outline: "MapRegular", filled: "MapFilled" },
  Bookmark: { outline: "BookmarkRegular", filled: "BookmarkFilled" },
  Tag: { outline: "TagRegular", filled: "TagFilled" },
  Archive: { outline: "ArchiveRegular", filled: "ArchiveFilled" },
  Inbox: { outline: "MailInboxRegular", filled: "MailInboxFilled" },
  ShoppingCart: { outline: "CartRegular", filled: "CartFilled" },
  CreditCard: { outline: "PaymentRegular", filled: "PaymentFilled" },
  Wallet: { outline: "WalletRegular", filled: "WalletFilled" },
  Pin: { outline: "PinRegular", filled: "PinFilled" },
  Maximize: { outline: "MaximizeRegular", filled: "MaximizeFilled" },
  ZoomIn: { outline: "ZoomInRegular", filled: "ZoomInFilled" },
  ZoomOut: { outline: "ZoomOutRegular", filled: "ZoomOutFilled" },
  Bold: { outline: "TextBoldRegular", filled: "TextBoldFilled" },
  Italic: { outline: "TextItalicRegular", filled: "TextItalicFilled" },
  Underline: {
    outline: "TextUnderlineRegular",
    filled: "TextUnderlineFilled",
  },
  Shield: { outline: "ShieldRegular", filled: "ShieldFilled" },
  Keyboard: { outline: "KeyboardRegular", filled: "KeyboardFilled" },
  BookOpen: { outline: "BookRegular", filled: "BookFilled" },
  CheckCircle2: {
    outline: "CheckmarkCircleRegular",
    filled: "CheckmarkCircleFilled",
  },
  XCircle: { outline: "DismissCircleRegular", filled: "DismissCircleFilled" },
  Activity: { outline: "PulseRegular", filled: "PulseFilled" },
  TrendingUp: {
    outline: "ArrowTrendingRegular",
    filled: "ArrowTrendingFilled",
  },
  MessageSquare: { outline: "ChatRegular", filled: "ChatFilled" },
  Paperclip: { outline: "AttachRegular", filled: "AttachFilled" },
  Palette: { outline: "ColorRegular", filled: "ColorFilled" },
  Monitor: { outline: "DesktopRegular", filled: "DesktopFilled" },
  Smartphone: { outline: "PhoneRegular", filled: "PhoneFilled" },
  PhoneCall: { outline: "CallRegular", filled: "CallFilled" },
  GitBranch: { outline: "BranchRegular", filled: "BranchFilled" },
  Bot: { outline: "BotRegular", filled: "BotFilled" },
  Sparkles: { outline: "SparkleRegular", filled: "SparkleFilled" },
  Wand: { outline: "WandRegular", filled: "WandFilled" },
  Lightbulb: { outline: "LightbulbRegular", filled: "LightbulbFilled" },
  Zap: { outline: "FlashRegular", filled: "FlashFilled" },
  Building2: { outline: "BuildingRegular", filled: "BuildingFilled" },
  ShoppingBag: { outline: "ShoppingBagRegular", filled: "ShoppingBagFilled" },
  Languages: { outline: "LocalLanguageRegular", filled: "LocalLanguageFilled" },
  BadgeCheck: {
    outline: "CheckmarkStarburstRegular",
    filled: "CheckmarkStarburstFilled",
  },
  Smile: { outline: "EmojiRegular", filled: "EmojiFilled" },
  CircleDashed: {
    outline: "CircleHintRegular",
    filled: "CircleHintFilled",
  },
  Clipboard: { outline: "ClipboardRegular", filled: "ClipboardFilled" },
  ClipboardPaste: {
    outline: "ClipboardPasteRegular",
    filled: "ClipboardPasteFilled",
  },
  Scissors: { outline: "CutRegular", filled: "CutFilled" },
  Calculator: { outline: "CalculatorRegular", filled: "CalculatorFilled" },
  LayoutGrid: { outline: "GridRegular", filled: "GridFilled" },
  Layout: { outline: "BoardRegular", filled: "BoardFilled" },
  Table: { outline: "TableRegular", filled: "TableFilled" },
  List: { outline: "ListRegular", filled: "ListFilled" },
  ArrowLeft: { outline: "ArrowLeftRegular", filled: "ArrowLeftFilled" },
  ArrowRight: { outline: "ArrowRightRegular", filled: "ArrowRightFilled" },
  ArrowUp: { outline: "ArrowUpRegular", filled: "ArrowUpFilled" },
  ArrowDown: { outline: "ArrowDownRegular", filled: "ArrowDownFilled" },
  ArrowUpRight: {
    outline: "ArrowUpRightRegular",
    filled: "ArrowUpRightFilled",
  },
  FolderOpen: { outline: "FolderOpenRegular", filled: "FolderOpenFilled" },
  FolderPlus: { outline: "FolderAddRegular", filled: "FolderAddFilled" },
  FileText: { outline: "DocumentTextRegular", filled: "DocumentTextFilled" },
  FileCode: { outline: "CodeRegular", filled: "CodeFilled" },
  RotateCw: {
    outline: "ArrowRotateClockwiseRegular",
    filled: "ArrowRotateClockwiseFilled",
  },
  GripVertical: {
    outline: "ReOrderDotsVerticalRegular",
    filled: "ReOrderDotsVerticalFilled",
  },
  Volume2: { outline: "Speaker2Regular", filled: "Speaker2Filled" },
  VolumeX: { outline: "SpeakerOffRegular", filled: "SpeakerOffFilled" },
  MapPin: { outline: "LocationRegular", filled: "LocationFilled" },
};

const MATERIAL: Record<string, string> = {
  Search: "search",
  X: "close",
  ChevronLeft: "chevron_left",
  ChevronRight: "chevron_right",
  ChevronDown: "expand_more",
  ChevronUp: "expand_less",
  ChevronsUpDown: "unfold_more",
  Check: "check",
  Minus: "remove",
  Plus: "add",
  MoreHorizontal: "more_horiz",
  MoreVertical: "more_vert",
  Calendar: "calendar_today",
  PanelLeft: "left_panel_open",
  Loader2: "progress_activity",
  Home: "home",
  Settings: "settings",
  Download: "download",
  Upload: "upload",
  Trash2: "delete",
  Trash: "delete",
  Mail: "mail",
  User: "person",
  Users: "group",
  CircleUser: "account_circle",
  Bell: "notifications",
  Menu: "menu",
  Eye: "visibility",
  EyeOff: "visibility_off",
  Lock: "lock",
  Unlock: "lock_open",
  Star: "star",
  Heart: "favorite",
  Bookmark: "bookmark",
  Tag: "sell",
  Filter: "filter_list",
  ListFilter: "filter_list",
  LogIn: "login",
  LogOut: "logout",
  Share: "share",
  Link: "link",
  ExternalLink: "open_in_new",
  Copy: "content_copy",
  Save: "save",
  Edit: "edit",
  Pencil: "edit",
  PenSquare: "edit_square",
  Folder: "folder",
  FolderOpen: "folder_open",
  FolderPlus: "create_new_folder",
  File: "draft",
  FileText: "description",
  FileCode: "code",
  Image: "image",
  Info: "info",
  CircleAlert: "error",
  TriangleAlert: "warning",
  OctagonX: "report",
  HelpCircle: "help",
  CircleHelp: "help",
  Sun: "light_mode",
  Moon: "dark_mode",
  RefreshCw: "refresh",
  RotateCw: "rotate_right",
  Send: "send",
  MessageSquare: "chat",
  Inbox: "inbox",
  Archive: "archive",
  ShoppingCart: "shopping_cart",
  ShoppingBag: "shopping_bag",
  CreditCard: "credit_card",
  Wallet: "account_balance_wallet",
  Map: "map",
  Globe: "language",
  MapPin: "location_on",
  Building2: "account_balance",
  Zap: "bolt",
  Lightbulb: "lightbulb",
  Sparkles: "auto_awesome",
  Bot: "smart_toy",
  Wand: "auto_fix_high",
  Pin: "keep",
  GripVertical: "drag_indicator",
  Maximize: "open_in_full",
  Minimize: "close_fullscreen",
  ZoomIn: "zoom_in",
  ZoomOut: "zoom_out",
  Bold: "format_bold",
  Italic: "format_italic",
  Underline: "format_underlined",
  Scissors: "content_cut",
  Clipboard: "content_paste",
  ClipboardPaste: "content_paste",
  ChartLine: "show_chart",
  ChartBar: "bar_chart",
  ChartPie: "pie_chart",
  TrendingUp: "trending_up",
  Activity: "monitoring",
  Calculator: "calculate",
  Shield: "shield",
  Keyboard: "keyboard",
  Languages: "translate",
  BookOpen: "menu_book",
  LifeBuoy: "support",
  Circle: "circle",
  CircleDashed: "radio_button_unchecked",
  Smile: "sentiment_satisfied",
  BadgeCheck: "verified",
  CheckCircle2: "check_circle",
  XCircle: "cancel",
  Timer: "timer",
  Mic: "mic",
  Volume2: "volume_up",
  VolumeX: "volume_off",
  Paperclip: "attach_file",
  Camera: "photo_camera",
  Bluetooth: "bluetooth",
  Wifi: "wifi",
  Cloud: "cloud",
  Database: "database",
  Server: "dns",
  Code: "code",
  Terminal: "terminal",
  GitBranch: "account_tree",
  Monitor: "desktop_windows",
  Smartphone: "smartphone",
  PhoneCall: "phone_in_talk",
  Palette: "palette",
  Table: "table",
  List: "list",
  LayoutGrid: "grid_view",
  Layout: "dashboard",
  PlusSquare: "add_box",
  ArrowLeft: "arrow_back",
  ArrowRight: "arrow_forward",
  ArrowUp: "arrow_upward",
  ArrowDown: "arrow_downward",
  ArrowUpRight: "north_east",
};

function firstExisting(
  candidates: Array<string | undefined>,
  exportSet: Record<string, unknown>,
): string | null {
  for (const name of candidates) {
    if (name && name in exportSet) return name;
  }
  return null;
}

function toMaterialName(lucideName: string): string {
  if (MATERIAL[lucideName]) return MATERIAL[lucideName]!;
  const spaced = lucideName
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
  return spaced.toLowerCase().replace(/\s+/g, "_");
}

function resolveLucide(lucideName: string): string | null {
  return firstExisting([lucideName, `${lucideName}Icon`], lucide);
}

function resolveMapping(
  lucideName: string,
  tablerOutline: string,
): Mapping | null {
  const resolvedLucide = resolveLucide(lucideName);
  if (!resolvedLucide) return null;

  const heroName = firstExisting(
    [
      HERO[lucideName],
      `${lucideName}Icon`,
      lucideName.endsWith("2") ? `${lucideName.slice(0, -1)}Icon` : undefined,
    ],
    heroOutline,
  );

  const phosphorName = firstExisting(
    [PHOSPHOR[lucideName], `${lucideName}Icon`],
    phosphor,
  );

  const tablerOut = firstExisting([tablerOutline, `Icon${lucideName}`], tabler);

  const tablerFilled = firstExisting(
    [tablerOut ? `${tablerOut}Filled` : undefined, tablerOut ?? undefined],
    tabler,
  );

  const fluentOverride = FLUENT[lucideName];
  const fluentOutline = fluentOverride
    ? fluentOverride.outline
    : firstExisting(
        [`${lucideName}Regular`, `${lucideName}IconRegular`],
        fluent,
      );
  const fluentFilled = fluentOverride
    ? fluentOverride.filled
    : firstExisting([`${lucideName}Filled`, `${lucideName}IconFilled`], fluent);

  const material = toMaterialName(lucideName);

  const heroSolidName = heroName ? firstExisting([heroName], heroSolid) : null;

  if (
    !heroName ||
    !heroSolidName ||
    !phosphorName ||
    !tablerOut ||
    !tablerFilled ||
    !fluentOutline ||
    !(fluentOutline in fluent) ||
    !fluentFilled ||
    !(fluentFilled in fluent)
  ) {
    return null;
  }

  return {
    lucide: resolvedLucide,
    "heroicons-outline": heroName,
    "heroicons-solid": heroSolidName,
    "phosphor-regular": phosphorName,
    "phosphor-fill": phosphorName,
    "phosphor-duotone": phosphorName,
    "tabler-outline": tablerOut,
    "tabler-filled": tablerFilled,
    "fluent-outline": fluentOutline,
    "fluent-filled": fluentFilled,
    "material-symbols-outlined": material,
    "material-symbols-rounded": material,
    "material-symbols-sharp": material,
  };
}

const catalog: Record<string, Mapping> = {};
const skipped: Array<{ semantic: string; lucide: string }> = [];

for (const seed of commonIconSeeds) {
  if (catalog[seed.semantic]) continue;
  const mapping = resolveMapping(seed.lucide, seed.tabler);
  if (mapping) {
    catalog[seed.semantic] = mapping;
  } else {
    skipped.push({ semantic: seed.semantic, lucide: seed.lucide });
  }
}

function formatEntry(name: string, mapping: Mapping): string {
  const key = name.includes("-") ? `"${name}"` : name;
  const lines = PACK_IDS.map(
    (packId) => `    "${packId}": "${mapping[packId]}",`,
  );
  return `  ${key}: {\n${lines.join("\n")}\n  }`;
}

const sortedNames = Object.keys(catalog).sort((a, b) => a.localeCompare(b));
const body = sortedNames
  .map((name) => formatEntry(name, catalog[name]!))
  .join(",\n");

const output = `import type { IconCatalog } from "./types";

export const iconCatalog = {
${body},
} as const satisfies IconCatalog;
`;

writeFileSync(
  resolve(__dirname, "../src/catalog/icon-catalog.ts"),
  output,
  "utf8",
);

console.log(`Generated ${sortedNames.length} icons`);
if (skipped.length > 0) {
  console.log(`Skipped ${skipped.length}:`);
  for (const item of skipped) {
    console.log(`  - ${item.semantic} (${item.lucide})`);
  }
}
