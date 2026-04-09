"use client";

import { dispatch } from "@designcombo/events";
import { DESIGN_LOAD } from "@designcombo/state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	TEMPLATES,
	TEMPLATE_CATEGORIES,
	type TemplateDefinition,
} from "../data/templates-data";

export const Templates = () => {
    const [activeCategory, setActiveCategory] = useState("All");

    const filtered =
        activeCategory === "All"
            ? TEMPLATES
            : TEMPLATES.filter((t) => t.category === activeCategory);

	const applyTemplate = (template: TemplateDefinition) => {
        try {
            const state = template.state();
            dispatch(DESIGN_LOAD, { payload: state });
            toast.success(`"${template.name}" template applied`);
        } catch (e: any) {
            toast.error(`Failed to apply template: ${e.message}`);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex h-12 flex-none items-center px-4 text-sm font-medium gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Templates
            </div>

            {/* Category filter */}
            <div className="flex flex-none gap-1.5 px-4 pb-3 overflow-x-auto no-scrollbar">
				{TEMPLATE_CATEGORIES.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
						className={`flex-none py-1 px-3 text-xs font-semibold rounded-full transition-colors ${
							activeCategory === cat
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <ScrollArea className="flex-1">
                <div className="flex flex-col gap-3 px-4 pb-6">
                    {filtered.map((template) => (
                        <button
                            key={template.id}
                            onClick={() => applyTemplate(template)}
                            className="w-full text-left rounded-xl overflow-hidden border border-border/60 hover:border-primary/50 transition-all duration-150 hover:shadow-lg group"
                        >
                            {/* Preview gradient */}
                            <div
                                className={`h-24 bg-gradient-to-br ${template.color} flex items-center justify-center text-4xl relative`}
                            >
                                {template.emoji}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
									<span className="text-white text-sm font-semibold">
										Apply Template
									</span>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-3 bg-card flex items-start justify-between gap-2">
                                <div>
                                    <div className="font-semibold text-sm">{template.name}</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                        {template.description}
                                    </div>
                                </div>
                                <Badge variant="secondary" className="text-[10px] flex-none">
                                    {template.category}
                                </Badge>
                            </div>
                        </button>
                    ))}
                </div>
            </ScrollArea>

            {/* Footer hint */}
            <div className="flex-none px-4 py-2 border-t border-border/50">
                <p className="text-[10px] text-muted-foreground text-center">
                    Clicking a template adds its elements to your timeline
                </p>
            </div>
        </div>
    );
};
