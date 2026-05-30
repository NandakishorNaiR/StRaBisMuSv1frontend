/**
 * SiteFooter — lazy loaded
 * OPTIMIZATION: footer content never affects LCP or FCP
 */
import React, { memo } from "react";

export default memo(function SiteFooter() {
    return ( <
        footer className = "site-footer"
        role = "contentinfo" >
        <
        p >
        <
        strong > ⚠️Medical Disclaimer: < /strong> EyeCheck AI is an AI-based
        screening tool and is { " " } <
        strong > NOT intended
        for medical diagnosis or clinical use < /strong>.
        Always consult a qualified ophthalmologist
        for accurate diagnosis and treatment. <
        /p> <
        p className = "footer-credit" >
        Developed and maintained by < strong > Knoxy Nexus < /strong> <
        /p> <
        /footer>
    );
});