import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Define the request structure to match your backend
interface QuoteRequestData {
  selected_retailers: string[];
  business_name: string;
  trading_as?: string;
  abn?: string;
  site_address?: string;
  client_name?: string;
  client_number?: string;
  client_email?: string;
  nmi?: string;
  mrin?: string;
  utility_type: string;
  quote_type: string;
  commission: string;
  start_date: string;
  offer_due: string;
  yearly_peak_est: number;
  yearly_shoulder_est: number;
  yearly_off_peak_est: number;
  yearly_consumption_est: number;
  current_retailer?: string; // Current FRMP
  loa_file_id?: string;
  invoice_file_id?: string;
  interval_data_file_id?: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestData: QuoteRequestData = await req.json();
    
    // Validate required fields
    if (!requestData.business_name) {
      return NextResponse.json({ 
        error: "business_name is required" 
      }, { status: 400 });
    }

    if (!requestData.nmi && !requestData.mrin) {
      return NextResponse.json({ 
        error: "Either nmi or mrin is required" 
      }, { status: 400 });
    }

    if (!requestData.selected_retailers || requestData.selected_retailers.length === 0) {
      return NextResponse.json({ 
        error: "At least one retailer must be selected" 
      }, { status: 400 });
    }

    // Log the request
    console.log(`Received quote request: business_name=${requestData.business_name}, utility_type=${requestData.utility_type}`);
    console.log('Backend API URL:', process.env.BACKEND_API_URL || 'http://localhost:8000');
    console.log('Backend API Key:', process.env.BACKEND_API_KEY || 'test-key');

    // Add utility type identifier for n8n switch node
    const getUtilityTypeIdentifier = (utilityType: string) => {
      switch (utilityType) {
        case 'electricity_ci':
          return 'C&I Electricity';
        case 'electricity_sme':
          return 'SME Electricity';
        case 'gas_ci':
          return 'C&I Gas';
        case 'gas_sme':
          return 'SME Gas';
        case 'waste':
          return 'Waste';
        case 'oil':
          return 'Oil';
        default:
          return utilityType;
      }
    };

    // Add retailer type identifier for n8n switch node
    const getRetailerTypeIdentifier = (retailers: string[]) => {
      const hasCI = retailers.some(r => r.includes('C&I'));
      const hasSME = retailers.some(r => r.includes('SME'));
      
      if (hasCI && hasSME) return 'Mixed C&I & SME';
      if (hasCI) return 'C&I Only';
      if (hasSME) return 'SME Only';
      return 'Other';
    };

    // Generate quote details based on quote type
    const getQuoteDetails = (quoteType: string) => {
      switch (quoteType) {
        case '3_year_stepped':
          return '3 Year Stepped Contract';
        case '2_year_fixed':
          return '2 Year Fixed Contract';
        case '1_year_fixed':
          return '1 Year Fixed Contract';
        case 'flexible':
          return 'Flexible Contract Options';
        default:
          return quoteType;
      }
    };

    // Prepare the payload for backend
    const backendPayload = {
      ...requestData,
      utility_type_identifier: getUtilityTypeIdentifier(requestData.utility_type),
      retailer_type_identifier: getRetailerTypeIdentifier(requestData.selected_retailers),
      quote_details: getQuoteDetails(requestData.quote_type),
      user_email: (session.user as any)?.email,
      timestamp: new Date().toISOString()
    };
    
    console.log('Sending to backend:', JSON.stringify(backendPayload, null, 2));
    
    let backendResponse: Response;
    try {
      // Call your backend tool/API
      backendResponse = await fetch(`${process.env.BACKEND_API_URL || 'http://localhost:8000'}/api/send-quote-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Try different authorization formats
          'Authorization': `Bearer ${process.env.BACKEND_API_KEY || 'test-key'}`,
          'X-API-Key': process.env.BACKEND_API_KEY || 'test-key',
        },
        body: JSON.stringify(backendPayload)
      });
      
      console.log('Backend response status:', backendResponse.status);
      console.log('Backend response headers:', Object.fromEntries(backendResponse.headers.entries()));
      
    } catch (fetchError: any) {
      console.error('Fetch error:', fetchError);
      throw new Error(`Failed to connect to backend: ${fetchError.message}`);
    }

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend API error response:', {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        headers: Object.fromEntries(backendResponse.headers.entries()),
        body: errorText
      });
      
      let errorMessage = 'Backend API error';
      try {
        const errorData = JSON.parse(errorText);
        // Handle FastAPI validation errors properly
        if (Array.isArray(errorData.detail)) {
          // FastAPI validation errors come as an array
          const validationErrors = errorData.detail.map((err: any) => 
            `${err.loc.join('.')}: ${err.msg}`
          ).join(', ');
          errorMessage = `Validation error: ${validationErrors}`;
        } else {
          errorMessage = errorData.detail || errorData.error || errorData.message || errorMessage;
        }
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      
      console.error('Final error message:', errorMessage);
      throw new Error(errorMessage);
    }

    const result = await backendResponse.json();
    
    console.log(`Quote request sent successfully for business: ${requestData.business_name}`);
    
    return NextResponse.json({
      success: true,
      quote_request_id: result.quote_request_id,
      message: 'Quote request sent successfully',
      suppliers_contacted: result.suppliers_contacted || [],
      estimated_response_time: result.estimated_response_time || '3-5 business days',
      email_drafts_created: result.email_drafts_created || []
    });

  } catch (error: any) {
    console.error('Quote request error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to send quote request' 
    }, { status: 500 });
  }
}