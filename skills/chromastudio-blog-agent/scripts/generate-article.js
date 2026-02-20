#!/usr/bin/env node

/**
 * ChromaStudio Blog Article Generator
 * Generates structured blog articles based on templates and brand voice
 */

const fs = require('fs');
const path = require('path');

class ChromaStudioBlogGenerator {
    constructor() {
        this.configPath = path.join(__dirname, '../config');
        this.templatesPath = path.join(__dirname, '../templates');
        
        // Load configuration files
        this.toneAnalysis = this.loadConfig('tone-analysis.json');
        this.contentFramework = this.loadConfig('content-framework.json');
        this.uiSpecs = this.loadConfig('ui-specifications.json');
    }

    loadConfig(filename) {
        try {
            const filePath = path.join(this.configPath, filename);
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (error) {
            console.error(`Error loading ${filename}:`, error.message);
            return {};
        }
    }

    loadTemplate(blogType) {
        try {
            const templatePath = path.join(this.templatesPath, `${blogType}-template.md`);
            return fs.readFileSync(templatePath, 'utf8');
        } catch (error) {
            console.error(`Template not found for ${blogType}:`, error.message);
            return null;
        }
    }

    generateArticle(options) {
        const {
            blogType,
            topic, 
            keyword,
            targetAudience = 'creators',
            contentLength = 'medium',
            ctaFocus = 'trial'
        } = options;

        // Validate blog type
        const validTypes = this.contentFramework.blog_types.categories.map(cat => 
            cat.name.toLowerCase().replace(/\s+/g, '-')
        );
        
        if (!validTypes.includes(blogType)) {
            throw new Error(`Invalid blog type. Must be one of: ${validTypes.join(', ')}`);
        }

        // Load appropriate template
        const template = this.loadTemplate(blogType);
        if (!template) {
            throw new Error(`Template not found for blog type: ${blogType}`);
        }

        // Generate article based on template and configurations
        const article = this.processTemplate(template, {
            topic,
            keyword, 
            targetAudience,
            contentLength,
            ctaFocus,
            blogType
        });

        return {
            content: article,
            metadata: this.generateMetadata(topic, keyword, blogType),
            suggestions: this.generateSuggestions(topic, keyword, blogType)
        };
    }

    processTemplate(template, options) {
        let processed = template;
        
        // Replace common placeholders
        const replacements = {
            '[TOPIC]': options.topic,
            '[KEYWORD]': options.keyword,
            '[BLOG_TYPE]': options.blogType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            '[TARGET_AUDIENCE]': options.targetAudience,
            '[DATE]': new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })
        };

        for (const [placeholder, value] of Object.entries(replacements)) {
            processed = processed.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
        }

        // Apply brand voice patterns
        processed = this.applyBrandVoice(processed, options);
        
        return processed;
    }

    applyBrandVoice(content, options) {
        const brandVoice = this.toneAnalysis.chromastudio_brand_voice;
        
        // Apply voice characteristics based on content type
        let enhanced = content;
        
        // Ensure empowering language
        const powerWords = brandVoice.power_words;
        const sentenceStarters = brandVoice.sentence_starters;
        
        // Add specific voice enhancements based on blog type
        switch (options.blogType) {
            case 'review':
                enhanced = this.enhanceReviewVoice(enhanced);
                break;
            case 'guide':
                enhanced = this.enhanceGuideVoice(enhanced);
                break;
            case 'comparison':
                enhanced = this.enhanceComparisonVoice(enhanced);
                break;
            default:
                enhanced = this.enhanceGeneralVoice(enhanced);
        }

        return enhanced;
    }

    enhanceReviewVoice(content) {
        // Add review-specific voice enhancements
        return content.replace(/\[COMPELLING BENEFIT\/OUTCOME\]/g, 
            'Revolutionary AI Tool That Transforms Creative Workflows');
    }

    enhanceGuideVoice(content) {
        // Add guide-specific voice enhancements
        return content.replace(/\[ACHIEVE SPECIFIC OUTCOME\]/g,
            'Create Professional Results');
    }

    enhanceComparisonVoice(content) {
        // Add comparison-specific voice enhancements
        return content.replace(/\[CATEGORY\]/g, 'Creative AI');
    }

    enhanceGeneralVoice(content) {
        // General voice improvements
        return content;
    }

    generateMetadata(topic, keyword, blogType) {
        return {
            title: this.generateSEOTitle(topic, keyword),
            description: this.generateMetaDescription(topic, keyword),
            keywords: this.generateKeywords(topic, keyword, blogType),
            category: blogType,
            readingTime: this.estimateReadingTime(topic, blogType),
            publishDate: new Date().toISOString(),
            author: 'ChromaStudio Team'
        };
    }

    generateSEOTitle(topic, keyword) {
        const brandVoice = this.toneAnalysis.chromastudio_brand_voice;
        const starters = brandVoice.sentence_starters;
        const powerWords = brandVoice.power_words;
        
        // Generate compelling title with keyword optimization
        return `${starters[0].replace('...', '')} ${topic} with ${keyword} - ${powerWords[0]} Results`;
    }

    generateMetaDescription(topic, keyword) {
        return `Discover how to ${topic.toLowerCase()} using ${keyword}. Complete guide with step-by-step instructions, pro tips, and ChromaStudio integration.`;
    }

    generateKeywords(topic, keyword, blogType) {
        const baseKeywords = [keyword, topic];
        const blogTypeKeywords = {
            'review': ['review', 'comparison', 'features', 'pricing'],
            'guide': ['how to', 'tutorial', 'step by step', 'guide'],
            'comparison': ['vs', 'comparison', 'alternatives', 'best'],
            'prompt': ['prompts', 'examples', 'templates', 'collection']
        };
        
        return [...baseKeywords, ...(blogTypeKeywords[blogType] || []), 'AI', 'creative tools', 'ChromaStudio'];
    }

    estimateReadingTime(topic, blogType) {
        const readingTimes = {
            'review': '8-12',
            'guide': '12-18', 
            'comparison': '10-15',
            'prompt': '5-8',
            'troubleshooting': '6-10'
        };
        
        return `${readingTimes[blogType] || '8-12'} min read`;
    }

    generateSuggestions(topic, keyword, blogType) {
        return {
            relatedTopics: this.getRelatedTopics(topic, blogType),
            internalLinks: this.suggestInternalLinks(topic, keyword),
            ctaPlacement: this.suggestCTAPlacement(blogType),
            visualContent: this.suggestVisualContent(topic, blogType)
        };
    }

    getRelatedTopics(topic, blogType) {
        // Generate related topic suggestions based on content framework
        return [
            `Advanced ${topic} Techniques`,
            `${topic} vs Alternatives`,
            `Best ${topic} Tools 2026`,
            `${topic} for Beginners`
        ];
    }

    suggestInternalLinks(topic, keyword) {
        return [
            `Link to ChromaStudio ${keyword} tool page`,
            `Reference related ${topic} tutorials`,
            `Connect to feature comparison pages`,
            `Link to getting started guides`
        ];
    }

    suggestCTAPlacement(blogType) {
        const placements = {
            'review': ['After feature section', 'Before final verdict', 'In conclusion'],
            'guide': ['After each major step', 'In pro tips section', 'At the end'],
            'comparison': ['After comparison table', 'In verdict section', 'At conclusion']
        };
        
        return placements[blogType] || ['Mid-article', 'Before FAQ', 'At conclusion'];
    }

    suggestVisualContent(topic, blogType) {
        const suggestions = {
            'review': ['Tool screenshots', 'Feature comparisons', 'Results examples'],
            'guide': ['Step-by-step screenshots', 'Before/after examples', 'Process diagrams'],
            'comparison': ['Side-by-side screenshots', 'Feature tables', 'Result comparisons']
        };
        
        return suggestions[blogType] || ['Hero image', 'Section illustrations', 'Example outputs'];
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
        console.log(`
Usage: node generate-article.js <blog-type> <topic> <keyword> [options]

Blog Types: review, guide, comparison, prompt, use-case, api, trend, troubleshooting, tool

Example: node generate-article.js review "Gemini 3.1 Pro" "AI model review"

Options:
  --audience <audience>    Target audience (creators, developers, businesses)
  --length <length>        Content length (short, medium, long)  
  --cta <focus>           CTA focus (signup, trial, specific-tool)
        `);
        process.exit(1);
    }

    const [blogType, topic, keyword] = args;
    const generator = new ChromaStudioBlogGenerator();
    
    try {
        const result = generator.generateArticle({
            blogType,
            topic,
            keyword,
            targetAudience: 'creators',
            contentLength: 'medium',
            ctaFocus: 'trial'
        });
        
        console.log('=== GENERATED ARTICLE ===\n');
        console.log(result.content);
        console.log('\n=== METADATA ===\n');
        console.log(JSON.stringify(result.metadata, null, 2));
        console.log('\n=== SUGGESTIONS ===\n');
        console.log(JSON.stringify(result.suggestions, null, 2));
        
    } catch (error) {
        console.error('Error generating article:', error.message);
        process.exit(1);
    }
}

module.exports = ChromaStudioBlogGenerator;
