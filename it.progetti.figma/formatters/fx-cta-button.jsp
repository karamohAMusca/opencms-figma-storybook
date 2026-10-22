<%@page buffer="none" session="false" pageEncoding="UTF-8" trimDirectiveWhitespaces="true"%>
<%@taglib prefix="cms" uri="http://www.opencms.org/taglib/cms"%>
<%-- GENERATO da figma-storybook/scripts/export-opencms.mjs: non modificare a mano, cambia figma-storybook/src/components/button/button.template.js. --%>
<%-- Componente Figma "Button" (1:22). Settings: variant (primary|secondary), width (auto|full) --%>
<cms:formatter var="content" val="value">
<div class="fx-element fx-cta-button">
    <a class="fx-button fx-button--${cms.element.settings.variant eq 'secondary' ? 'secondary' : 'primary'}${cms.element.settings.width eq 'full' ? ' fx-button--full' : ''}" href="${value.Link.toLink}">${value.Text}</a>
</div>
</cms:formatter>
