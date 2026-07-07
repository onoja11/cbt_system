import logo from "../assets/logo_startrite.png";

const Logo = ({ size = 70, showText = false }) => {
    return (
        <div className="flex items-center gap-3">
            <img
                src={logo}
                alt="Start-Rite Schools Logo"
                width={size}
                height={size}
                className="object-contain"
            />

            {showText && (
                <div>
                    <h1 className="text-xl font-bold text-[#2A1A63]">
                        START-RITE SCHOOLS
                    </h1>
                    <p className="text-sm text-gray-600">
                        Securing the Future
                    </p>
                </div>
            )}
        </div>
    );
};

export default Logo;